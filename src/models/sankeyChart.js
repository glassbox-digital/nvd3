nv.models.sankeyChart = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var sankey = nv.models.sankey();
    var tooltip = nv.models.tooltip();

    var margin = {top: 30, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , font = 'serif'
        , id = Math.round(Math.random() * 100000)
        , defaultState = null
        , noData = null
        , duration = 250
        , dispatch = d3.dispatch('stateChange', 'changeState', 'renderEnd')
        ;

    tooltip.duration(0);

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);
    tooltip
        .headerEnabled(false)
        .valueFormatter(function (d, i) {
            return d;
        });

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(sankey);

        selection.each(function (data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function () {
                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data || !data.nodes || !data.nodes.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            selectedNodes = data.nodes.filter(function (n) {
                return n.selected === true;
            });

            // Setup containers and skeleton of chart
            var gChart = container.selectAll('g.nv-wrap.nv-sankeyChart').data([data]);
            var gChartEnter = gChart.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sankeyChart');
            //var g = gChart.select('g');

            gChartEnter.append('g').attr('class', 'nv-sankeyWrap');

            gChart.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            sankey.width(availableWidth).height(availableHeight);

            var wrap = gChart.select('.nv-sankeyWrap').datum(data);
            wrap.call(sankey);

        });

        renderWatch.renderEnd('sankeyChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    sankey.dispatch.on('elementMouseover.tooltip', function (evt) {
        //console.log(evt);
        evt['series'] = [{
            key: evt.data.name,
            value: d3.format(",.0f")(evt.data.value || 0),
            color: evt.data.color
        }, {
            key: 'Ratio',
            value: d3.format(",.0f")(evt.data.ratio || 0),
            color: color(evt.data.ratio)
        },
        ];
        tooltip.data(evt).hidden(false);
    });

    sankey.dispatch.on('elementMouseout.tooltip', function (evt) {
        tooltip.hidden(true);
    });

    sankey.dispatch.on('elementMousemove.tooltip', function (evt) {
        tooltip();
    });

    var selectedNodes = [];

    sankey.dispatch.on('nodeClick.node', function (evt) {

        var d = evt.data;

        var idx = selectedNodes.indexOf(d);

        if (idx === -1) {
            selectedNodes.push(d);
            d.selected = true;
        }
        else {
            delete d.selected;
            selectedNodes.splice(idx, 1);
        }

        dispatch.changeState(selectedNodes);
    });

    sankey.dispatch.on('linkClick.link', function (evt) {

        var d = evt.data;

        if (d.hasOwnProperty('source') && d.hasOwnProperty('target')) {

            var idxS = selectedNodes.indexOf(d.sourceNode);
            var idxT = selectedNodes.indexOf(d.targetNode);

            if (idxS === -1 || idxT === -1) {
                if (idxS === -1) {
                    selectedNodes.push(d.sourceNode);
                    d.sourceNode.selected = true;
                }
                if (idxT === -1) {
                    selectedNodes.push(d.targetNode);
                    d.targetNode.selected = true;
                }

                d.selected = true;
            }
            else {
                delete d.selected;
                selectedNodes.splice(Math.max(idxS, idxT), 1);
                selectedNodes.splice(Math.min(idxS, idxT), 1);
            }
        }

        dispatch.changeState(selectedNodes);
    });

    /*
     sankey.dispatch.on('nodeDblClick.node', function (evt) {

     var d = evt.data;

     var idx = selectedNodes.indexOf(d);

     if (idx === -1) {
     selectedNodes = [d];
     d.selected = true;
     }
     else {
     if (selectedNodes.length === 1) {
     delete d.selected;
     selectedNodes = [];
     }
     else {
     delete d.selected;
     selectedNodes.splice(idx, 1);
     }
     }

     dispatch.changeState(selectedNodes);
     });
     */

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.sankey = sankey;
    chart.tooltip = tooltip;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData: {
            get: function () {
                return noData;
            }, set: function (_) {
                noData = _;
            }
        },
        defaultState: {
            get: function () {
                return defaultState;
            }, set: function (_) {
                defaultState = _;
            }
        },

        // options that require extra logic in the setter
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = _;
                sankey.color(color);
            }
        },
        font: {
            get: function () {
                return font;
            }, set: function (_) {
                font = _;
                sankey.font(font);
            }
        },
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
                renderWatch.reset(duration);
                sankey.duration(duration);
            }
        },
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = _.top !== undefined ? _.top : margin.top;
                margin.right = _.right !== undefined ? _.right : margin.right;
                margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                margin.left = _.left !== undefined ? _.left : margin.left;
            }
        }
    });
    nv.utils.inheritOptions(chart, sankey);
    nv.utils.initOptions(chart);
    return chart;
};
