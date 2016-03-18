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

//### Load your data

//Original structure:
//"date","open","high","low","close","volume","oi"
//11/01/1985,115.48,116.78,115.48,116.28,900900,0

//New structure:
//Consignee,ContainerType,ShipmentType,OriginService,DestinationService,ETD,Measurement,OriginCountry,DestinationCountry
//BENIKE2   ,DRY ,          OCE,        CFS,            CFS,       2014-01-20, 0.0000000000, MY,        PP

d3.csv('../dist/BATBI-N-changed.csv', function (data) {
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


    // Maintain running tallies by year as filters are applied or removed
    var yearlyPerformanceGroup = yearlyDimension.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.absGain += v.close - v.open;
            p.fluctuation += Math.abs(v.close - v.open);
            p.sumIndex += (v.open + v.close) / 2;
            p.avgIndex = p.sumIndex / p.count;
            p.percentageGain = p.avgIndex ? (p.absGain / p.avgIndex) * 100 : 0;
            p.fluctuationPercentage = p.avgIndex ? (p.fluctuation / p.avgIndex) * 100 : 0;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.absGain -= v.close - v.open;
            p.fluctuation -= Math.abs(v.close - v.open);
            p.sumIndex -= (v.open + v.close) / 2;
            p.avgIndex = p.count ? p.sumIndex / p.count : 0;
            p.percentageGain = p.avgIndex ? (p.absGain / p.avgIndex) * 100 : 0;
            p.fluctuationPercentage = p.avgIndex ? (p.fluctuation / p.avgIndex) * 100 : 0;
            return p;
        },
        /* initialize p */
        function () {
            return {
                count: 0,
                absGain: 0,
                fluctuation: 0,
                fluctuationPercentage: 0,
                sumIndex: 0,
                avgIndex: 0,
                percentageGain: 0
            };
        }
    );

    // Dimension by full date
    var dateDimension = nikeData.dimension(function (d) {
        return d.dd;
    });


    var minDate = dateDimension.bottom(1)[0].dd;
    var maxDate = dateDimension.top(1)[0].dd;

    // Dimension by month
    var moveMonths = nikeData.dimension(function (d) {
        return d.month;
    });

    // Group by total movement within month
    var monthlyMoveGroup = moveMonths.group().reduceSum(function (d) {
        return Math.abs(d.close - d.open);
    });
    // Group by total volume within move, and scale down result
    //    var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
    //        return d.Measurement / 500000;
    //    });

    var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
        return d.Measurement;
    });

    // Determine a histogram of percent changes
    //    var fluctuation = nikeData.dimension(function (d) {
    //        return Math.round((d.close - d.open) / d.open * 100);
    //    });
    //    var fluctuationGroup = fluctuation.group();

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

    nVolumeChart.width(990)
        .height(140)
        .margins({
            top: 0,
            right: 50,
            bottom: 20,
            left: 50
        })
        .dimension(moveMonths)
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