//# dc.js Getting Started and How-To Guide
'use strict';
var chartColours = ['#658c9d','#59b5dd', '#a5e0ec', '#90c380', '#36b265', '#33764a'];

//To debug/print filters
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
var nCount = dc.dataCount('.dc-data-count');
var dataTable = dc.dataTable('.dc-data-table');

//### Load your data

//Data structure:
//Consignee,ContainerType,ShipmentType,OriginService,DestinationService,ETD,Measurement,OriginCountry,DestinationCountry
//Customer1,DRY ,OCE,CFS, CFS,11/01/2014, 0.0000000000, MY,PP


//NB: den henter data, men den fejler på noget string.slice i d3. Er ikke nået videre end til at hente dataen.
d3.json('http://localhost:5000/api/', function (data) {
    // Since its a csv file we need to format the data a bit.
    //Dateformat with BATBI-N-changed.csv:
    //var dateFormat = d3.time.format('%Y-%m-%d');

    console.log(data);

    var dateFormat = d3.time.format('%d/%m/%Y');
    var numberFormat = d3.format('.2f');

    data.forEach(function (d) {
            d.dd = dateFormat.parse(d.ETD);
            d.month = d3.time.month(d.dd); // pre-calculate month for better performance
        if(d.DestinationService !== "CY" && d.DestinationService !== "CFS" && d.DestinationService !== "CY " && d.DestinationService !== "CFS "){
            d.DestinationService = "Unknown"
        }
        if(d.OriginService !== "CY" && d.OriginService !== "CFS" && d.OriginService !== "CY " && d.OriginService !== "CFS "){
            d.OriginService = "Unknown"
        }
    });
    
    //### Create Crossfilter Dimensions and Groups

    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var nData = crossfilter(data);
    var all = nData.groupAll();

    // Dimension by year
    var yearlyDimension = nData.dimension(function (d) {
        return d3.time.year(d.dd).getFullYear();
    });

    // Dimension by full date
    var dateDimension = nData.dimension(function (d) {
        return d.dd;
    });

    var minDate = dateDimension.bottom(1)[0].dd;
    var maxDate = dateDimension.top(1)[0].dd;

    // Dimension by month
    var byMonth = nData.dimension(function (d) {
        return d.month;
    });

    var volumeByMonthGroup = byMonth.group().reduceSum(function (d) {
        return d.Measurement;
    });

    // Summarize volume by quarter
    var quarter = nData.dimension(function (d) {
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

    var containerTypes = nData.dimension(function (d) {
        return d.ContainerType;
    });
    var containerTypesGroup = containerTypes.group();
    
    var shipmentTypes = nData.dimension(function (d) {
        return d.ShipmentType;
    });
    var shipmentTypesGroup = shipmentTypes.group();

    var originServices = nData.dimension(function (d) {
        return d.OriginService;
    });
    var originServicesGroup = originServices.group();

    var destinationServices = nData.dimension(function (d) {
        return d.DestinationService;
    });
    var destinationServicesGroup = destinationServices.group();

    // Counts per weekday
    var dayOfWeek = nData.dimension(function (d) {
        var day = d.dd.getDay();
        var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return day + '.' + name[day];
    });
    var dayOfWeekGroup = dayOfWeek.group();

    var originCountries = nData.dimension(function (d) {
        return d.OriginCountry;
    });
    var originCountriesGroup = originCountries.group();
    
    var destCountries = nData.dimension(function (d) {
        return d.DestinationCountry;
    });

    var destCountriesGroup = destCountries.group();
//Wanted to use only top 20 for the chart, but was causing an error. Could be a good idea to fix it. Also tried with fake group.
//    var destCountriesTop20 = destCountries.top(20);

//### Create charts
    nVolumeChart.width(650)
        .height(140)
        .margins({
            top: 5,
            right: 50,
            bottom: 20,
            left: 50
        })
        .dimension(byMonth)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(2)
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
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
        .ordinalColors(chartColours)
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    nCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
        .dimension(nData)
        .group(all)
        // (_optional_) `.html` sets different html when some records or all records are selected.
        // `.html` replaces everything in the anchor with the html given using the following function.
        // `%filter-count` and `%total-count` are replaced with the values obtained.
        .html({
            some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
                ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'\'>Reset All</a>',
            all: 'All records selected. Please click on the graph to apply filters.'
        });

    //TODO: Make pagination on table
    dataTable /* dc.dataTable('.dc-data-table', 'chartGroup') */
        .dimension(yearlyDimension)
        // Data table does not use crossfilter group but rather a closure
        // as a grouping function
        .group(function (d) {
            var format = d3.format('02d');
            return d.dd.getFullYear() + '/' + format((d.dd.getMonth() + 1));
        })
        // (_optional_) max number of records to be shown, `default = 25`
        .size(30)
        // There are several ways to specify the columns; see the data-table documentation.
        // This code demonstrates generating the column header automatically based on the columns.
        .columns([
            // Use the `d.date` field; capitalized automatically
            'ETD',
            'ContainerType',
            'ShipmentType',
            {
                // Specify a custom format for column 'Origin / Destination' by using a label with a function.
                label: 'Org.service/ Dest.service',
                format: function (d) {
                    return d.OriginService +' / '+ d.DestinationService;
                }
            },
            {
                // Specify a custom format for column 'Origin / Destination' by using a label with a function.
                label: 'Origin/ Destination',
                format: function (d) {
                    return d.OriginCountry +' / '+ d.DestinationCountry;
                }
            },
            // Use `d.volume`
            'Measurement'
        ])
        // (_optional_) sort using the given field, `default = function(d){return d;}`
        .sortBy(function (d) {
            return d.dd;
        })
        // (_optional_) sort order, `default = d3.ascending`
        .order(d3.ascending)
        // (_optional_) custom renderlet to post-process chart using [D3](http://d3js.org)
        .on('renderlet', function (table) {
            table.selectAll('.dc-table-group').classed('info', true);
        });

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
