function getDateLabels(startDate, numPeriods) {
    var timeFormat = 'MM/DD/YYYY';
    var result = [];
    for (var days=0; days < numPeriods; days++) {
        var dateStr = moment(startDate).add(days, 'd').format(timeFormat);
        var date = new Date(dateStr);
        result.push(date.getTime() / 1000);
    }
    console.log("Building labels...");
    console.log(result);
    return result;
}

function getDataset(feature, colorParam, type='bar', yAxisID='Categorical', fill=true) {
    var color = Chart.helpers.color;
    var dataset = {
        type: type,
        label: feature.name,
        fill: fill,
        backgroundColor: color(colorParam).alpha(0.5).rgbString(),
        borderColor: window.chartColors.red,
        data: feature.data,
        yAxisID: yAxisID
      }
    return dataset;
}

function getSeries(feature, scale="Numerical", numDecimals=2, fill=null) {
    var series = {
        show: feature.shouldDisplay,
        label: feature.name,
        scale: scale,
        value: (u, v) => v == null ? "-" : v.toFixed(2),
        stroke: getRandomColor(),
        fill: fill,
        width: 2
      };
    return series;
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }