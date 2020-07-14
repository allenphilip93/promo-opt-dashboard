# Promotions Optimization Dashboard

A NodeJS application build to assist development, debugging and testing for Promotions Optimization.

Currently the application supports 2 utilities:

* <b>Data Visualization Tool</b> -  Used view time series data for all the causals for a DFUs post running MLR/XGB SRE process with debugging enabled
* <b>CBAT Data Extraction Tool</b> - Used to export tables from the db in the form of SQL scripts and mask them or generate data by cloning part of the db data. 

<b>Demo</b> can be found here - http://md1npdvpmpep01.dev.corp.local:3000/#/

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

#### NodeJS
NodeJS needs to be installed to run the application. You can find the installer in the link mentioned below.

```
https://nodejs.org/en/download/
```

#### Oracle DB Installation
In order to use the tool, you need to have a working oracle db installation with the SID, services 
and listeners all configured and running. 

DB server must reside on the same VPN and be accessible on command line like

```cmd
$ sqlplus user/pass@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(Host=hostname.network (Port=1521))(CONNECT_DATA=(SID=remote_SID)))
```

### Installing

There is no installer for this project. Just clone the repository and pull a release branch, setup the prerequisites as per requirement. Once the above steps are completed the application is good to go.

To run the application run the following command from the home folder of the project.

```cmd
$ npm start
```

This deploys the application on the machine. You should see a message like "Listening on port 3000.. " if the 
deployement is successful.

## Screenshots

#### Dashboard to search and view DFU level debug information from any remote DB server.

<img src="raw/sample/screenshot-1.png?at=refs%2Fheads%2Fmaster" width="1200">



#### Enable or disable features as per requirement

<img src="raw/sample/screenshot-2.png?at=refs%2Fheads%2Fmaster" width="1200">



#### Select and zoom in on a specific period

<img src="raw/sample/screenshot-3.png?at=refs%2Fheads%2Fmaster" width="1200">



#### Reference plot to know where you are at while zooming

<img src="raw/sample/screenshot-4.png?at=refs%2Fheads%2Fmaster" width="1200">



#### View all the essential control parameters in one place

<img src="raw/sample/screenshot-5.png?at=refs%2Fheads%2Fmaster" width="1200">



#### View, sort & filter through the model configuration

<img src="raw/sample/screenshot-6.png?at=refs%2Fheads%2Fmaster" width="1200">



#### Mask existing DFU or set of DFUs based on custom SQL query from a remote DB

<img src="raw/sample/screenshot-7.png?at=refs%2Fheads%2Fmaster" width="1200">

## Built With

* [NodeJS](https://nodejs.org/) - The web application framework used
* [AdminLTE](<https://adminlte.io/>) - Dashboard UI framework used
* [AngularJS](<https://angularjs.org/>) - Web framework for REST API and view model management
* [uPlot](<https://github.com/leeoniya/uPlot>) - A small, fast chart for time series, lines, areas, ohlc & bars
* [Async](https://caolan.github.io/async/) - Utility module for implementation
* [OracleDB](<https://www.npmjs.com/package/oracledb>) - Oracle adapters for connections and querying
* [log4js](<https://www.npmjs.com/package/log4js>) - NPM module for logging from server side
* [toastr](<https://github.com/CodeSeven/toastr>) - Simple JavaScript toast notifications
* [Bootstrap](http://getbootstrap.com/) - Styling library used
* [jQuery](<https://jquery.com/>) - Essential utility library
* [VisualStudioCode](<https://code.visualstudio.com/>) - IDE for development and testing

## Versioning

We use [GIT](http://stash.jda.com/) for versioning. For the versions available, see the [repository](<https://stash.jda.com/users/1021618/repos/promo-opt-dashboard/browse>). 

## Authors

* **Allen Philip J** - *Development & Design*
