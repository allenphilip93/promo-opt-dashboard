var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var fs = require('fs');
var resolve = require('path').resolve;
var async = require('async');
var log4js = require('log4js');
var config = require(resolve('./bin/utils/config'));
var constants = require(resolve('./bin/utils/constants'));

// Setup the logger
log4js.configure(
    {
        appenders: {
            file: {
                type: 'file',
                filename: 'logs/dashboard.log',
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
var logger = log4js.getLogger('dashboard');

//===================================================================================
//=======================   GET ROUTER AND SUPPORT METHODS   ========================
//===================================================================================
/* GET home page. */
router.get('/', function(req, res, next) {
    res.send("200");
});

//===================================================================================
//==============================   POST ROUTER   ====================================
//===================================================================================
/* POST trigger extraction */
router.post("/", function(req, res, next) {
    async.waterfall([
        function(cb){
            logger.info("Stage 1 of execution!");
            var fields = req.body;
            logger.debug(fields);
            for (var key in fields) {
                config[key] = fields[key];
            }
            cb(null);
        },
        //
        function(cb) {
            logger.info("Stage 2 of execution!");
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
                    cb(null, conn);
                }
            });
        },
        //
        function(conn, cb) {
            logger.info("Stage 3 of execution!");
            logger.info('Loading data from DfuFeatureMatrix..');
            var query = "SELECT * FROM DFUFEATUREMATRIX WHERE DMDUNIT='" + config.dmdunit + "' AND LOC='"+ config.loc + "' AND DMDGROUP='"+ config.dmdgroup +"' AND ACTION='Estimation'";
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
                    cb(null, conn, extractDebugData(result));
            });
        },
        //
        function(conn, resObject, cb) {
            logger.info("Stage 4 of execution!");
            logger.info('Loading data from DfuModelSummary..');
            logger.info('=======================================================================================');
            var query = "SELECT * FROM DFUMODELSUMMARY WHERE DMDUNIT='"+ config.dmdunit +"' AND LOC='"+config.loc + "' AND DMDGROUP='"+ config.dmdgroup +"'";
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
                    cb(null, conn, extractSummaryData(result, resObject));
            });
        },
        //
        function(conn, resObject, cb) {
            logger.info("Stage 5 of execution!");
            logger.info('Loading data from Exception table..');
            logger.info('=======================================================================================');
            var query = "select exception, exceptiondetails from decompgroupexception where dmdunit = '"+config.dmdunit+"' and loc = '"+config.loc + "' AND DMDGROUP='"+ config.dmdgroup +"'";
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
                    cb(null, conn, extractException(result, resObject));
            });
        },
        //
        function(conn, resObject, cb) {
            logger.info("Stage 6 of execution!");
            logger.info('Loading data from ModelConfig..');
            logger.info('=======================================================================================');
            var query = "SELECT * FROM MODELCONFIG WHERE CONFIGSET IN (SELECT DISTINCT MODELCONFIGSET FROM DFUPRICEPARAM WHERE DMDUNIT='"+config.dmdunit+"' AND LOC='"+config.loc + "' AND DMDGROUP='"+ config.dmdgroup +"') AND ENABLEDSW = 1";
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
                    cb(null, conn, extractModelConfig(result, resObject));
            });
        },
        //
        function(conn, resObject, cb) {
            logger.info("Stage 7 of execution!");
            logger.info('Loading data from PriceGlobalParam..');
            logger.info('=======================================================================================');
            var query = "SELECT * FROM PRICEGLOBALPARAM WHERE PARAMETER like 'DRM.PROMO.%' or PARAMETER like 'DRM.PROMOMODEL.%' or PARAMETER like 'DRM.CALIBRATION.CALENDAR'";
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
                    cb(null, conn, extractPGPs(result, resObject));
            });
        },
        //
        function(conn, resObject, cb) {
            logger.info("Stage 8 of execution!");
            logger.info('Loading data from SRE Node Config Props..');
            logger.info('=======================================================================================');
            var query = "select prop_name, prop_value from wwfmgr.sre_node_config_props where service_name like 'DRM.PromoModel'";
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
                    cb(null, conn, extractNodeProps(result, resObject));
            });
        },
        function(conn, resObject, cb) {
            logger.info("Stage 9 of execution!");
            logger.info("Closing connections..")
            if (conn) {
                conn.close(function (err) {
                    if (err) {
                        logger.error("An error occurred while fetching the connection");
                        logger.error(err);
                        return res.status(400).send({
                            message: err.message
                        });
                    } else {
                        logger.debug("Closing DB connection..");
                    }
                });
            }
            res.send(resObject);
            cb(null, resObject);
        }], 
    function(err) {
        if (err) {
            logger.error("In waterfall error cb: ==>", err, "<==");
            logger.error(err);
            return res.status(400).send({
                message: err.message
            });
        }
    });
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
var fetchParams = function(req, cb) {
    var fields = {};
    req.pipe(req.busboy);
    req.busboy.on('field', function(fieldname, val) {
        fields[fieldname] = val;
    });
    req.busboy.on('finish', function(){
        logger.info("Completed parsing fields: ");
        logger.debug(fields);
        return cb(null, fields);
    });
};

/**
 * Parse the fields object and update it into a class global object <config>
 *     which has predefined default values
 *
 * @param fields  -  object with all the user form submitted
 * @param cb      -  callback
 * @returns {*}
 */
var updateConfig = function(fields, cb) {
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
    return cb(null);
};

/**
 * Reset the DFU data - dmdunit, loc and dmdgroup if custom query is passed
 *
 * @param cb    - callback
 * @returns {*}
 */
var resetForCustomQuery = function(cb) {
    if (config.customQueryCondn) {
        logger.info("Resetting the DFU config data");
        config.dmdunit = {};
        config.dmdgroup = {};
        config.loc = {};
    }
    return cb(null);
};

/**
 * Establish connection to the db using the passed schema credentials or default config values
 *
 * @param cb  - callback
 */
var doconnect = function(cb){
  logger.info("Connecting to db " + config.ora_username + "/" + config.ora_password + "@" + config.ora_connectionString);
  oracledb.getConnection({
      user: config.ora_username,
      password: config.ora_password,
      connectString: config.ora_connectionString
  },
  function(err, conn){
      if (err) {
          logger.error(err);
          return err;
      } else {
          logger.info("Connection to db has been established!");
          return conn;
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
var startWriter = function(conn, cb) {
    var date = new Date();
    date = date.valueOf() + "_";
    logger.info('Creating file @ ' + constants.output_save_path + date + constants.default_save_file);
    var writer = fs.createWriteStream(constants.output_save_path + date +  constants.default_save_file, {
        flags: 'a' // 'a' means appending (old data will be preserved)
    });
    return cb(null, conn, writer);
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
var handleCustomQuery = function(conn, writer, cb) {
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
                    // logger.error(message);
                    return cb(err);
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
                return cb(null, conn, writer);
            });
    } else {
      return cb(null, conn, writer);
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
var maskDFUInformation = function(conn, writer, cb) {
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
    return cb(null, conn, writer);
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
var doquery = function(conn, cb){
    logger.info('=======================================================================================');
    var query = buildSQLStatement();
    logger.debug('Executing query : ' + query);
    conn.execute(
        query, [], {maxRows: config.MAX_ROWS}, function (err, result) {
            if (err) {
                // logger.error(message);
                return cb(err);
            }
            logger.debug(result);
            return cb();
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
var buildSQLStatement = function() {
  var query = "SELECT * FROM DFUFEATUREMATRIX WHERE DMDUNIT='1463015' AND LOC='STR-028' AND ACTION='Estimation'";
  return query;
};

/**
 * Closes the db connection and the writer instance closing the file for edit
 *
 * @param conn
 * @param writer
 */
var dorelease = function(conn, writer, cb){
    logger.info("Closing connections..")
    if (conn) {
        conn.close(function (err) {
            if (err) {
                logger.error(err.message);
            } else {
                logger.debug("Closing DB connection..");
            }
        });
    }
    if (writer) {
        writer.end();
        logger.info("Closing writer connection..");
    }
    return cb();
};

var extractDebugData = function(rawdata) {
    dfu = {};
    dfu.feature = []
    dfu.config = config;
    rawdata.rows.forEach(function(value, index, array) {
        dfu.dmdunit = value[0];
        dfu.dmdgroup = value[1];
        dfu.loc = value[2];
        dfu.startdate = value[3];
        dfu.calendar = value[4];
        feature = {}
        feature.name = value[5];
        feature.action = value[756];
        if (config.defaultFeatures.includes(feature.name)) {
            feature.shouldDisplay = true;
        } else {
            feature.shouldDisplay = false;
        }
        data = []
        var iscategorical = true;
        value.forEach(function(value, index, array) {
            if (index >= 6 && value != null && index < 756) {
                data.push(value);
                if (value > 1) {
                    iscategorical = false;
                }
            }
        });
        feature.iscategorical = iscategorical;
        feature.data = data;
        dfu.feature.push(feature);
    });
    return dfu;
};

var extractSummaryData = function(rawdata, resObject) {
    logger.info(rawdata);
    summary = {};
    rawdata.rows.forEach(function(value, index, array) {
        summary.trainingtime = Math.round(value[5] * 100) / 100;
        summary.accuracy = Math.round(value[6] * 100) / 100;
        summary.bias = Math.round(value[7] * 100) / 100;
        summary.rsquared = Math.round(value[8] * 100) / 100;
        summary.wmape = Math.round(value[9] * 100) / 100;
        summary.mse = Math.round(value[11] * 100) / 100;
        summary.adjrsquared = Math.round(value[12] * 100) / 100;
        summary.durbinwatsonstat = Math.round(value[13] * 100) / 100;
        summary.smape = Math.round(value[14] * 100) / 100;
        summary.mean = Math.round(value[15] * 100) / 100;
        summary.se = Math.round(value[16] * 100) / 100;
    });
    resObject.summary = summary;
    return resObject;
};

var extractModelConfig = function(rawdata, resObject) {
    logger.info(rawdata);
    modelconfig = [];
    rawdata.rows.forEach(function(value, index, array) {
        var config = {}
        config.name = value[1];
        config.type = value[2];
        config.value = value[4];
        config.forcesw = value[6];
        config.priority = value[7];
        config.gapfillmethod = value[8];
        modelconfig.push(config);
    });
    resObject.modelconfig = modelconfig;
    return resObject;
};

var extractException = function(rawdata, resObject) {
    logger.info(rawdata);
    resObject.exceptions = rawdata.rows;
    return resObject;
}

var extractPGPs = function(rawdata, resObject) {
    logger.info(rawdata);
    pgps = [];
    rawdata.rows.forEach(function(value, index, array) {
        pgp = {}
        pgp.name = value[0];
        var type = value[1];
        if (type === "STRING") {
            pgp.value = value[4];
        } else if (type === "NUMBER") {
            pgp.value = value[2];
        }
        pgps.push(pgp);
    });
    resObject.pgps = pgps;
    return resObject;
}

var extractNodeProps = function(rawdata, resObject) {
    logger.info(rawdata);
    resObject.nodeProps = rawdata.rows;
    return resObject;
}

module.exports = router;