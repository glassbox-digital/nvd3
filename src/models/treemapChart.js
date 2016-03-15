nv.models.treemapChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var treemap = nv.models.treemap();
    var tooltip = nv.models.tooltip();

    var margin = {top: 30, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , id = Math.round(Math.random() * 100000)
        , defaultState = null
        , noData = null
        , duration = 250
        , dispatch = d3.dispatch('stateChange', 'changeState','renderEnd')
        ;

    tooltip.duration(0);

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);
    tooltip
        .headerEnabled(false)
        .valueFormatter(function(d, i) {
            return d;
        });

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(treemap);

        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() {
                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-treemapChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-treemapChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-treemapWrap');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            treemap.width(availableWidth).height(availableHeight);
            var sunWrap = g.select('.nv-treemapWrap').datum(data);
            d3.transition(sunWrap).call(treemap);

        });

        renderWatch.renderEnd('treemapChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    treemap.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt['series'] = {
            key: evt.data.name,
            value: evt.data.value,
            color: evt.color
        };
        tooltip.data(evt).hidden(false);
    });

    treemap.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true);
    });

    treemap.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip();
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.treemap = treemap;
    chart.tooltip = tooltip;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData:         {get: function(){return noData;},         set: function(_){noData=_;}},
        defaultState:   {get: function(){return defaultState;},   set: function(_){defaultState=_;}},

        // options that require extra logic in the setter
        color: {get: function(){return color;}, set: function(_){
            color = _;
            treemap.color(color);
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            treemap.duration(duration);
        }},
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }}
    });
    nv.utils.inheritOptions(chart, treemap);
    nv.utils.initOptions(chart);
    return chart;
};
