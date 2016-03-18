//# dc.js Getting Started and How-To Guide
'use strict';


function print_filter(filter) {
    var f = eval(filter);
    if (typeof (f.length) != "undefined") {} else {}
    if (typeof (f.top) != "undefined") {
        f = f.top(Infinity);
    } else {}
    if (typeof (f.dimension) != "undefined") {
        f = f.dimension(function (d) {
            return "";
        }).top(Infinity);
    } else {}
    console.log(filter + "(" + f.length + ") = " + JSON.stringify(f).replace("[", "[\n\t").replace(/}\,/g, "},\n\t").replace("]", "\n]"));
}

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

// ### Create Chart Objects

var nVolumeChart = dc.barChart('#n-volume-chart');
var quarterChart = dc.pieChart('#quarter-chart');
var containerTypesChart = dc.pieChart('#container-types-chart');
var shipmentTypesChart = dc.pieChart('#shipment-types-chart');
var dayOfWeekChart = dc.rowChart('#day-of-week-chart');
var originServicesChart = dc.rowChart('#originservices-chart');
var destinationServicesChart = dc.rowChart('#destinationservices-chart');
var originCountriesChart = dc.rowChart('#origin-countries-chart');
var destinationCountriesChart = dc.rowChart('#dest-countries-chart');

//### Load your data

//Original structure:
//"date","open","high","low","close","volume","oi"
//11/01/1985,115.48,116.78,115.48,116.28,900900,0

//New structure:
//Consignee,ContainerType,ShipmentType,OriginService,DestinationService,ETD,Measurement,OriginCountry,DestinationCountry
//BENIKE2   ,DRY ,          OCE,        CFS,            CFS,       2014-01-20, 0.0000000000, MY,        PP

d3.csv('../dist/BATBI-n-changed.csv', function (data) {
    // Since its a csv file we need to format the data a bit.
    var dateFormat = d3.time.format('%Y-%m-%d');
    var numberFormat = d3.format('.2f');

    data.forEach(function (d) {
        d.dd = dateFormat.parse(d.ETD);
        d.month = d3.time.month(d.dd); // pre-calculate month for better performance
        d.close = +d.close; // coerce to number
        d.open = +d.open;
    });

    //### Create Crossfilter Dimensions and Groups

    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var nikeData = crossfilter(data);
    var all = nikeData.groupAll();

    // Dimension by year
    var yearlyDimension = nikeData.dimension(function (d) {
        return d3.time.year(d.dd).getFullYear();
    });
//    
////    var yearlyDimensionGroup = nikeData.yearlyDimension(function (d) {
////        return d3.time.year(d.dd).getFullYear();
////    });
//    var countMeasure = yearlyDimension.group().reduceCount();
//    //print_filter(countMeasure);
//    
//    var countMeasure2 = yearlyDimension.group().reduceSum(function(fact) { return fact.Measurement; });
//    print_filter(countMeasure2);
//    
//    var legMeasure = yearlyDimension.group().reduceCount(function(fact) { return fact.OriginService; });
//var a = legMeasure.top(4);
//    console.log(a);
//console.log('There are'+ a[0].value + ' ' +a[0].key + 'legs in my house.');
//console.log('There are'+ a[1].value + ' ' +a[1].key + 'legs in my house.');

    
    // Dimension by full date
    var dateDimension = nikeData.dimension(function (d) {
        return d.dd;
    });


    var minDate = dateDimension.bottom(1)[0].dd;
    var maxDate = dateDimension.top(1)[0].dd;

    // Dimension by month
    var byMonth = nikeData.dimension(function (d) {
        return d.month;
    });

    var volumeByMonthGroup = byMonth.group().reduceSum(function (d) {
        return d.Measurement;
    });
    

    // Summarize volume by quarter
    var quarter = nikeData.dimension(function (d) {
        var month = d.dd.getMonth();
        if (month <= 2) {
            return 'Q1';
        } else if (month > 2 && month <= 5) {
            return 'Q2';
        } else if (month > 5 && month <= 8) {
            return 'Q3';
        } else {
            return 'Q4';
        }
    });

    var quarterGroup = quarter.group().reduceSum(function (d) {
        return d.Measurement;
    });

    var containerTypes = nikeData.dimension(function (d) {
        return d.ContainerType;
    });
    var containerTypesGroup = containerTypes.group();
    
    var shipmentTypes = nikeData.dimension(function (d) {
        return d.ShipmentType;
    });
    var shipmentTypesGroup = shipmentTypes.group();

    var originServices = nikeData.dimension(function (d) {
        return d.OriginService;
    });
    var originServicesGroup = originServices.group();

    var destinationServices = nikeData.dimension(function (d) {
        return d.DestinationService;
    });
    var destinationServicesGroup = destinationServices.group();

    // Counts per weekday
    var dayOfWeek = nikeData.dimension(function (d) {
        var day = d.dd.getDay();
        var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return day + '.' + name[day];
    });
    var dayOfWeekGroup = dayOfWeek.group();

    var originCountries = nikeData.dimension(function (d) {
        return d.OriginCountry;
    });
    var originCountriesGroup = originCountries.group();
    
    var destCountries = nikeData.dimension(function (d) {
        return d.DestinationCountry;
    });
    
    var destCountriesGroup = destCountries.group();
//Wanted to use only top 20 for the chart, but was causing an error. Could be a good idea to fix it
//    var destCountriesTop20 = destCountries.top(20);
    
    nVolumeChart.width(700)
        .height(140)
        .margins({
            top: 0,
            right: 50,
            bottom: 20,
            left: 50
        })
        .dimension(byMonth)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .round(d3.time.month.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.months);

    containerTypesChart
        .width(180)
        .height(180)
        .radius(80)
        .dimension(containerTypes)
        .group(containerTypesGroup)
        .label(function (d) {
            if (containerTypesChart.hasFilter() && !containerTypesChart.hasFilter(d.key)) {
                return d.key + '(0%)';
            }
            var label = d.key;
            if (all.value()) {
                label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
            }
            return label;
        });

    shipmentTypesChart
        .width(180)
        .height(180)
        .radius(80)
        .dimension(shipmentTypes)
        .group(shipmentTypesGroup)
        .label(function (d) {
            if (shipmentTypesChart.hasFilter() && !shipmentTypesChart.hasFilter(d.key)) {
                return d.key + '(0%)';
            }
            var label = d.key;
            if (all.value()) {
                label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
            }
            return label;
        });

    quarterChart
        .width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(quarter)
        .group(quarterGroup);

    originServicesChart
        .width(180)
        .height(180)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .group(originServicesGroup)
        .dimension(originServices)
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef'])
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    destinationServicesChart
        .width(180)
        .height(180)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .group(destinationServicesGroup)
        .dimension(destinationServices)
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef'])
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    dayOfWeekChart
        .width(180)
        .height(180)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // Assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split('.')[1];
        })
        // Title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    originCountriesChart
        .width(250)
        .height(originCountriesGroup.size() * 17 + 40)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .gap(2)
        .fixedBarHeight(15)
        .group(originCountriesGroup)
        .dimension(originCountries)
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef'])
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);
    
    destinationCountriesChart
        .width(250)
        .height(destCountriesGroup.size() * 17 + 40)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .gap(2)
        .fixedBarHeight(15)
        .group(destCountriesGroup)
        .dimension(destCountries)
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef'])
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);
    //#### Rendering

    //simply call `.renderAll()` to render all charts on the page
    dc.renderAll();
    /*
    // Or you can render charts belonging to a specific chart group
    dc.renderAll('group');
    // Once rendered you can call `.redrawAll()` to update charts incrementally when the data
    // changes, without re-rendering everything
    dc.redrawAll();
    // Or you can choose to redraw only those charts associated with a specific chart group
    dc.redrawAll('group');
    */

});

//#### Versions

//Determine the current version of dc with `dc.version`
d3.selectAll('#version').text(dc.version);