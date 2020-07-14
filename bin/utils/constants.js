var constants = {

    // PATHS
    "output_save_path" : "./public/downloads/cbat-ext/",
    "output_save_url" : "../downloads/cbat-ext/",
    "default_save_file" : "export_erpe_data.sql",
    "output_file_uri" : "utils/cbat-ext",
    "main_page_path" : "pages/cbat-util",
    "filelist_partial_path" : "partials/file-list",

    // QUERY CONSTANTS
    "select_query" : "SELECT * FROM ",
    "distinct_query" : "SELECT DISTINCT DMDUNIT, DMDGROUP, LOC FROM ",
    "custom_query" : "SELECT DISTINCT A.DMDUNIT FROM DMDUNIT A ",
    "where_condn" : " WHERE ",
    "union_operator" : " UNION ",

    // TABLE NAMES
    "table_dmdunit" : "DMDUNIT",
    "table_dmdgroup" : "DMDGROUP",
    "table_loc" : "LOC",

    // DATATYPE CONSTS
    "datatype_string" : "string",
    "datatype_object" : "object",

    // TABLE TYPES
    "tabletype_parent" : "PARENT",
    "tabletype_dfu_child" : "DFU_CHILD",
    "tabletype_custom" : "CUSTOM",

    // PARENT TABLES SETUP
    "parent_dfu_tables" : ['DMDUNIT', 'LOC', 'DMDGROUP'],
    "children_dfu_tables" : {
        "CDS_disabled": ['DFUVIEW', 'HIST', 'DFUPRICEPARAM', 'HISTWIDEEXT', 'DFUEFFPRICEEXT'],
        "CDS_enabled": ['DFUVIEW', 'HISTWIDE', 'DFUPRICEPARAM', 'HISTWIDEEXT', 'DFUEFFPRICEEXT']
    }

};

module.exports = constants;