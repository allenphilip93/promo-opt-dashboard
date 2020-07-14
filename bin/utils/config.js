var configurations = {

    "table_map" : {
        "BASE_PRICE" : {
            "CDS_disabled" : ['DFUEFFPRICE', 'DFUBASEPRICE', 'DFUPRICESENSITIVITY', 'DFUPRICECOEF'],
            "CDS_enabled" : ['DFUEFFPRICE', 'DFUBASEPRICE', 'DFUPRICESENSITIVITY', 'DFUPRICECOEF']
        }
    },

    // CONFIGURATION PARAMS
    "SPLIT_CHAR": ",",
    "MAX_ROWS": 9999,
    "maskDFUEnabled" : "true",

    // DEFAULT PARAMS,
    "ora_username" : "SCPOMGR",
    "ora_password" : "SCPOMGR",
    "ora_connectionString" : "localhost/O12CR201",
    "mask_dmdunit" : "ERPE_TEST_DMDUNIT_",
    "mask_dmdgroup" : "ERPE_TEST_DMDGROUP_",
    "mask_loc" : "ERPE_TEST_LOC_",
    "active_mode" : "BASE_PRICE",
    "CDS_state" : "CDS_disabled",
    "regexUDC" : "(?:UDC_|U_)",

    // FEATURE CONFIG
    "defaultFeatures" : ["ACTUAL_SALES", "FITTED_HIST", "EFFPRICE", "INVALID_PERIODS"]

};

module.exports = configurations;