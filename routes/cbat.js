var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var fs = require('fs');
var resolve = require('path').resolve;
var config = require(resolve('./bin/utils/config'));
var constants = require(resolve('./bin/utils/constants'));
var async = require('async');
var log4js = require('log4js');

// Setup the logger
log4js.configure(
    {
        appenders: {
            file: {
                type: 'file',
                filename: 'logs/cbat-ext/cbat-extracter.log',
                maxLogSize: 10 * 1024 * 1024, // = 10Mb
                numBackups: 5, // keep five backup files
                compress: true, // compress the backups
                encoding: 'utf-8',
                // mode: 0o0640,
                flags: 'w+'
            },
            out: {
                type: 'stdout'
            }
        },
        categories: {
            default: { appenders: ['file', 'out'], level: 'all' }
        }
    }
);
var logger = log4js.getLogger('cbat-extracter');

//===================================================================================
//=======================   GET ROUTER AND SUPPORT METHODS   ========================
//===================================================================================
/* GET home page. */
router.get('/', function(req, res, next) {
    try {
        listFilesinDir(constants.output_save_path, res);
    } catch (exe) {
        res.send(exe);
    }
});

var listFilesinDir = function(dirPath, res, deletedFile="") {
    logger.info("Loading file from " + resolve(dirPath));
    var output = {};
    files = fs.readdirSync(dirPath);
    output.filelist = {};
    var file_list =[];
    files.forEach( function( file, index ) {
        if (file != deletedFile) {
            var obj = {};
            obj.index = index;
            obj.file = file;
            var datestr = new Date(parseInt(file.split("_")[0])).toISOString();
            obj.date = datestr.replace(/T/, ' ').      // replace T with a space
                        replace(/\..+/, '');     // delete the dot and everything after
            obj.path = constants.output_save_url + file;
            file_list.push(obj);
        }
    });
    output.filelist.files = file_list;
    output.filelist.URI = constants.output_file_uri;
    output.form = config;
    logger.debug(output);
    logger.info("Sending response object");
    res.send(output);
};

//===================================================================================
//==============================   DELETE ROUTER   ==================================
//===================================================================================
/* DELETE entries. */
router.delete("/:name", function(req, res) {
    fs.unlink(constants.output_save_path + req.params.name, (err) => {
        logger.info("Successfully deleted " + resolve(constants.output_save_path + req.params.name));
        listFilesinDir(constants.output_save_path, res, req.params.name);
    });
});

//===================================================================================
//==============================   POST ROUTER   ====================================
//===================================================================================
/* POST trigger extraction */
router.post("/", function(req, res, next) {
    try {
        async.waterfall([
            function(cb){
                cb(null, req, res)
            },
            fetchParams,
            updateConfig,
            resetForCustomQuery,
            doconnect,
            startWriter,
            handleCustomQuery,
            maskDFUInformation,
            function(res, conn, writer, cb) {
                    var table_map = {};
                    constants.parent_dfu_tables.forEach(function(value){
                        table_map[value] = constants.tabletype_parent;
                    });
                    constants.children_dfu_tables[config.CDS_state].forEach(function(value){
                        table_map[value] = constants.tabletype_dfu_child;
                    })
                    config.table_map[config.active_mode][config.CDS_state].forEach(function(value){
                        table_map[value] = constants.tabletype_custom;
                    });
                    logger.debug(table_map);
                    for (var key in table_map) {
                        doquery(res, conn, writer, key, table_map[key]);
                    }
                    logger.info("Completed queries!");
                    // dorelease(conn, writer);
                    // cb();
                    // async.forEachOfSeries(table_map, function(value, key, callback){
                    //     doquery(conn, writer, key, value, callback);
                    // }, function (err, conn, writer) {
                    //     logger.error(conn);
                    //     logger.error(writer);
                    //     if (err) {
                    //         logger.error("In forEachSeries error cb: ==>", err, "<==");
                    //     }
                    //     return cb(null, conn, writer);
                    // });
                }
            ], function(err) {
                if (err) {
                    logger.error("In waterfall error cb: ==>", err, "<==");
                    logger.error("An error occurred while fetching the connection");
                    logger.error(err);
                    return res.status(400).send({
                        message: err.message
                    });
                }
                listFilesinDir(constants.output_save_path, res);
            });
        } catch (err) {
            logger.error("An error occurred while fetching the connection");
            logger.error(err);
            return res.status(400).send({
                message: err.message
            });
        }
});

//===================================================================================
//=====================   PIPELINE METHODS FOR POST OPERATION   =====================
//===================================================================================

/**
 * Fetches the params from the request object and puts into an object
 *
 * @param req     -  request object
 * @param cb      -  callback
 */
var fetchParams = function(req, res, cb) {
    var fields = req.body;
    // req.pipe(req.busboy);
    // req.busboy.on('field', function(fieldname, val) {
    //     fields[fieldname] = val;
    // });
    // req.busboy.on('finish', function(){
    //     logger.info("Completed parsing fields: ");
    //     logger.debug(fields);
        // return cb(null, fields);
    // });
    logger.debug(fields);
    return cb(null, res, fields);
};

/**
 * Parse the fields object and update it into a class global object <config>
 *     which has predefined default values
 *
 * @param fields  -  object with all the user form submitted
 * @param cb      -  callback
 * @returns {*}
 */
var updateConfig = function(res, fields, cb) {
    for (var key in fields) {
        if (key === 'dmdunit' || key === 'dmdgroup' || key === 'loc') {
            config[key] = fields[key].split(config.SPLIT_CHAR).reduce(function(map, obj){
                map[obj] = obj;
                return map;
            }, {});
        } else {
            config[key] = fields[key];
        }
    }
    return cb(null, res);
};

/**
 * Reset the DFU data - dmdunit, loc and dmdgroup if custom query is passed
 *
 * @param cb    - callback
 * @returns {*}
 */
var resetForCustomQuery = function(res, cb) {
    if (config.customQueryCondn) {
        logger.info("Resetting the DFU config data");
        config.dmdunit = {};
        config.dmdgroup = {};
        config.loc = {};
    }
    return cb(null, res);
};

/**
 * Establish connection to the db using the passed schema credentials or default config values
 *
 * @param cb  - callback
 */
var doconnect = function(res, cb){
  logger.info("Connecting to db " + config.ora_username + "/" + config.ora_password + "@" + config.ora_connectionString);
  oracledb.getConnection({
      user: config.ora_username,
      password: config.ora_password,
      connectString: config.ora_connectionString
  },
  function(err, conn){
      if (err) {
        logger.error("An error occurred while fetching the connection");
        logger.error(err);
        return res.status(400).send({
            message: err.message
        });
      } else {
          logger.info("Connection to db has been established!");
          cb(null, res, conn);
      }
  });
};

/**
 * Creates a sql file to which we'll append out insert queries to using parameters defaulted
 * in the config object and returns an writer instance for the file
 *
 * @param conn   -  db connection object
 * @param cb     -  callback
 * @returns {*}
 */
var startWriter = function(res, conn, cb) {
    var date = new Date();
    date = date.valueOf() + "_";
    logger.info('Creating file @ ' + constants.output_save_path + date + constants.default_save_file);
    writer = fs.createWriteStream(constants.output_save_path + date +  constants.default_save_file, {
        flags: 'a', // 'a' means appending (old data will be preserved)
        'autoClose': true
    });
    return cb(null, res, conn, writer);
};

/**
 * Run a query across all the target tables configured in the config object, to look for all the
 * possible dfu ids (dmdunit, loc, dmdgroup) and populate the config object with the same
 *
 * @param conn    -  db connection object
 * @param writer  -  writer instance for output file
 * @param cb      -  callback
 * @returns {*}
 */
var handleCustomQuery = function(res, conn, writer, cb) {
    if(config.customQueryCondn) {
        logger.info('=======================================================================================');
        logger.info("Custom Query identified..");
        var query = "";

        // Build query to select all the parent table primary keys so as to load the parent table records
        config.table_map[config.active_mode][config.CDS_state].map(function(value, index){
            query = query + constants.distinct_query + value +
                constants.where_condn + constants.table_dmdunit + " IN (" +
                constants.custom_query + " WHERE " + config.customQueryCondn + ")";
            if (index < config.table_map[config.active_mode][config.CDS_state].length -1) {
                query = query + constants.union_operator
            }
        });
        logger.debug("Executing query: " + query);
        conn.execute(
            query, [], {maxRows: config.MAX_ROWS}, function (err, result) {
                if (err) {
                    logger.error("An error occurred while fetching the connection");
                    logger.error(err);
                    return res.status(400).send({
                        message: err.message
                    });
                }
                // Load the DFU information
                for (var row_idx = 0; row_idx < result.rows.length; row_idx++) {
                    for (var col_idx = 0; col_idx < result.rows[row_idx].length; col_idx++) {
                        if (result.metaData[col_idx].name === constants.table_dmdunit
                            && config.dmdunit[result.rows[row_idx][col_idx]] === undefined) {
                            config.dmdunit[result.rows[row_idx][col_idx]] = result.rows[row_idx][col_idx];
                        } else if (result.metaData[col_idx].name === constants.table_loc
                            && config.loc[result.rows[row_idx][col_idx]] === undefined) {
                            config.loc[result.rows[row_idx][col_idx]] = result.rows[row_idx][col_idx];
                        } else if (result.metaData[col_idx].name === constants.table_dmdgroup
                            && config.dmdgroup[result.rows[row_idx][col_idx]] === undefined) {
                            config.dmdgroup[result.rows[row_idx][col_idx]] = result.rows[row_idx][col_idx];
                        }
                    }
                }
                logger.info('=======================================================================================');
                return cb(null, res, conn, writer);
            });
    } else {
      return cb(null, res, conn, writer);
    }
};

/**
 * Masks the DFU (dmdunit, loc, dmdgroup) information if the config object has
 * the maskDFUEnabled flag set to True
 *
 * @param conn    - db connection instance
 * @param writer  - writer instance for output file
 * @param cb      - callback
 * @returns {*}
 */
var maskDFUInformation = function(res, conn, writer, cb) {
    if (config.maskDFUEnabled) {
        logger.info("Masking the dfu information");
        var idx = 0;
        for (var key in config.dmdunit) {
            config.dmdunit[key] = config.mask_dmdunit + idx;
            idx = idx + 1;
        }
        idx = 0;
        for (var key in config.dmdgroup) {
            config.dmdgroup[key] = config.mask_dmdgroup + idx;
            idx = idx + 1;
        }
        idx = 0;
        for (var key in config.loc) {
            config.loc[key] = config.mask_loc + idx;
            idx = idx + 1;
        }
    }
    return cb(null, res, conn, writer);
};

/**
 * Builds the SQL statement based on the table type (PARENT/ ERPE) and then executes the same
 * while appending the results to the output file.
 *
 * @param conn         - db connection instance
 * @param writer       - writer instance for output file
 * @param table_name   - table to be queried for
 * @param table_type   - type of the table to build the SQL cmd accordingly
 * @param cb           - callback
 */
var doquery = function(res, conn, writer, table_name, table_type){
    logger.info('=======================================================================================');
    var query = buildSQLStatement(table_name, table_type);
    logger.debug('Executing query : ' + query);
    conn.execute(
        query, [], {maxRows: config.MAX_ROWS}, function (err, result) {
            if (err) {
                logger.error("An error occurred while fetching the connection");
                logger.error(err);
                return res.status(400).send({
                    message: err.message
                });
            }
            // logger.debug(result.metaData);
            for (var row_idx = 0; row_idx < result.rows.length; row_idx++) {
                var column_names = '(';
                var column_values = '(';

                for (var col_idx = 0; col_idx < result.rows[row_idx].length; col_idx++) {
                    // Must not add UDCs to INSERT query
                    if (config.regexUDC && config.regexUDC.length > 0
                            && result.metaData[col_idx].name.search(new RegExp(config.regexUDC)) != -1) {
                        continue;
                    }
                    // Add necessary elements for the SQL query
                    if (col_idx > 0) {
                        column_names = column_names + ' , '
                        column_values = column_values + ' , '
                    }
                    column_names = column_names + result.metaData[col_idx].name;

                    // Find what is the datatype of the column and handle accordingly
                    if (typeof result.rows[row_idx][col_idx] === constants.datatype_string) {
                        if (result.metaData[col_idx].name === constants.table_dmdunit){
                            column_values = column_values + "\'" +
                                config.dmdunit[result.rows[row_idx][col_idx]] + "\'";
                        } else if(result.metaData[col_idx].name === constants.table_loc){
                            column_values = column_values + "\'" +
                                config.loc[result.rows[row_idx][col_idx]] + "\'";
                        } else if(result.metaData[col_idx].name === constants.table_dmdgroup){
                            column_values = column_values + "\'" +
                                config.dmdgroup[result.rows[row_idx][col_idx]] + "\'";
                        } else {
                            column_values = column_values + "\'" +
                                result.rows[row_idx][col_idx] + "\'";
                        }
                    } else if (result.rows[row_idx][col_idx] == null) {
                        column_values = column_values + "null";
                    } else if (typeof result.rows[row_idx][col_idx] === constants.datatype_object) {
                        column_values = column_values + "TO_DATE(\'"
                            + result.rows[row_idx][col_idx].toLocaleDateString() + "\', 'MM/DD/YYYY')";
                    } else {
                        column_values = column_values + result.rows[row_idx][col_idx].toString();
                    }

                }
                column_names = column_names + " )";
                column_values = column_values + " )";
                var import_sql_query = 'INSERT INTO ' + table_name + ' ' + column_names
                    + ' VALUES ' + column_values + ';';
                writer.write(import_sql_query + "\r\n");
                logger.info("Completed exporting " + result.rows.length + " entrie(s) to the import sql");
                return;
            }
        });
};

//===================================================================================
//====================   SUPPORT METHODS FOR PIPELINE  ==============================
//===================================================================================
/**
 * Builds the SQL statement based on three scenarios: PARENT type, ERPE type without
 * custom query and ERPE type with custom query.
 *
 * @param table_name      - table name
 * @param table_type      - table type
 * @returns {string}      - returns a string representing the SQL query
 */
var buildSQLStatement = function(table_name, table_type) {
  logger.info("Building the SQL statement for " + table_name + " of type: " + table_type);
  var query = constants.select_query + table_name + " WHERE ";

  // Query for the parent tables - DMDUNIT, DMDGROUP, LOC
  if (table_type === constants.tabletype_parent) {
    query = query + table_name + " IN ('" + Object.keys(config[table_name.toLowerCase()]).join("','") + "')";
  } else if (table_type === constants.tabletype_custom || table_type === constants.tabletype_dfu_child) {

        // Query for all children and custom dfu tables when no custom query condn is passed
        if (!config.customQueryCondn) {
            query = query + constants.table_dmdunit + " IN ('" + Object.keys(config.dmdunit).join("','") + "') " +
                "AND " + constants.table_loc + " IN ('" + Object.keys(config.loc).join("','") + "') " +
                "AND " + constants.table_dmdgroup + " IN ('" + Object.keys(config.dmdgroup).join("','") + "')";
        } else {

            // Query for custom dfu tables when custom query condn passed
            if (table_type === constants.tabletype_custom) {
                query = query + constants.table_dmdunit + " IN (" + constants.custom_query +
                        " WHERE " + config.customQueryCondn + ")";

            // Query for child dfu tables (DFUPRICEPARAM, HIST) when custom query condn passed
            } else if (table_type === constants.tabletype_dfu_child) {
                query = query + constants.table_dmdunit + " IN (" + constants.custom_query +
                    ", DFUPRICEPARAM B WHERE A.DMDUNIT = B.DMDUNIT AND " + config.customQueryCondn + ")";
            }
        }
  }
  return query;
};

/**
 * Closes the db connection and the writer instance closing the file for edit
 *
 * @param conn
 * @param writer
 */
var dorelease = function(res, conn, writer){
    if (conn) {
        logger.info("Closing connections..");
        conn.close(function (err) {
            if (err) {
                logger.error("An error occurred while fetching the connection");
                logger.error(err);
                return res.status(400).send({
                    message: err.message
                });
            }
            logger.info("Closed connection..");
        });
    }
    if (writer) {
        logger.info("Closing writer..");
        writer.close();
        writer.end();
        logger.info("Closed writer..");
    }
};

module.exports = router;
