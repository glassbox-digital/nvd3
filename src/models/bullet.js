
// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/

nv.models.bullet = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , orient = 'left' // TODO top & bottom
        , reverse = false
        , ranges = function(d) { return d.ranges }
        , markers = function(d) { return d.markers ? d.markers : [] }
        , measures = function(d) { return d.measures }
        , rangeLabels = function(d) { return d.rangeLabels ? d.rangeLabels : [] }
        , markerLabels = function(d) { return d.markerLabels ? d.markerLabels : []  }
        , measureLabels = function(d) { return d.measureLabels ? d.measureLabels : []  }
        , forceX = [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
        , width = 380
        , height = null
        , container = null
        , tickFormat = null
        , getX = function(d){ return d[0]; }
        , getY = function(d){ return d[1]; }
        , color = nv.utils.getColor(['#1f77b4'])
        , dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove')
        ;

    function chart(selection) {
        selection.each(function(d, i) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            var rangez = ranges.call(this, d, i).slice(),
                markerz = markers.call(this, d, i),
                measurez = measures.call(this, d, i).slice();

            // Setup Scales
            // Compute the new x-scale.
            var x1 = d3.scale.linear()
                .domain( d3.extent(d3.merge([forceX, [d3.max(rangez, getY)], [d3.sum(measurez, getY)]])) )
                .range(reverse ? [availableWidth, 0] : [0, availableWidth]);

            // Retrieve the old x-scale, if this is an update.
            var x0 = this.__chart__ || d3.scale.linear()
                .domain([0, Infinity])
                .range(x1.range());

            // Stash the new scale.
            this.__chart__ = x1;

/*
            var rangeMin = d3.min(rangez), //rangez[2]
                rangeMax = d3.max(rangez), //rangez[0]
                rangeAvg = rangez[1];
*/

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-bullet').data([d]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-bullet');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            g.selectAll('rect.nv-range').data(rangez)
                .enter()
                .append('rect')
                .attr('class', 'nv-range');

            var w1 = function (d) {
                    return Math.abs(x1(getY(d)) - x1(0))
                },
                xp1 = function (d) {
                    return d < 0 ? x1(getY(d)) : x1(0)
                };

            g.selectAll('rect.nv-range')
                .attr('height', availableHeight)
                .attr('width', w1)
                .attr('x', xp1);

            g.selectAll('rect.nv-measure')
                .data(measurez)
                .enter()
                .append('rect')
                .attr('class', 'nv-measure');


            g.selectAll('rect.nv-measure')
                .style('fill', color)
                .attr('height', 20)
                .attr('y', function(d,i){ return i * 20; } )
                .attr('width', function(d){ return getY(d) < 0 ? x1(0) - x1(getY(d)) : x1(getY(d)) - x1(0); } )
                .attr('x', function(d,i){ return x1(i > 0 ? d3.sum(measurez.slice(0,i), getY) : 0); })
                .on('mouseover', function(d,i) {
                    dispatch.elementMouseover({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mouseout', function(d,i) {
                    dispatch.elementMouseout({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                });

            g.selectAll("line.nv-marker")
              .data(markerz)
              .enter()
              .append('line')
              .attr('class', 'nv-marker');

            g.selectAll("line.nv-marker")
                .attr('x1', function(d){ return x1(getY(d)); })
                .attr('x2', function(d){ return x1(getY(d)); })
                .attr('y1', 0)
                .attr('y2', availableHeight);

            wrap.selectAll('.nv-range')
                .on('mouseover', function(d,i) {
                    dispatch.elementMouseover({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mouseout', function(d,i) {
                    dispatch.elementMouseout({
                        value: getY(d),
                        label: getX(d),
                        color: d3.select(this).style("fill")
                    })
                });
        });

        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        ranges:      {get: function(){return ranges;}, set: function(_){ranges=_;}}, // ranges (bad, satisfactory, good)
        markers:     {get: function(){return markers;}, set: function(_){markers=_;}}, // markers (previous, goal)
        measures: {get: function(){return measures;}, set: function(_){measures=_;}}, // measures (actual, forecast)
        forceX:      {get: function(){return forceX;}, set: function(_){forceX=_;}},
        width:    {get: function(){return width;}, set: function(_){width=_;}},
        height:    {get: function(){return height;}, set: function(_){height=_;}},
        tickFormat:    {get: function(){return tickFormat;}, set: function(_){tickFormat=_;}},
        x: {
            get: function () {
                return getX;
            }, set: function (_) {
                getX = _;
            }
        },
        y: {
            get: function () {
                return getY;
            }, set: function (_) {
                getY = _;
            }
        },

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        orient: {get: function(){return orient;}, set: function(_){ // left, right, top, bottom
            orient = _;
            reverse = orient == 'right' || orient == 'bottom';
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};


