
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
        , color = nv.utils.getColor(['#1f77b4'])
        , dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove')
        ;

    function chart(selection) {
        selection.each(function(d, i) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            var rangez = ranges.call(this, d, i).slice()/*.sort(d3.descending)*/,
                markerz = markers.call(this, d, i)/*.slice().sort(d3.descending)*/,
                measurez = measures.call(this, d, i).slice()/*.sort(d3.descending)*/,
                rangeLabelz = rangeLabels.call(this, d, i).slice(),
                markerLabelz = markerLabels.call(this, d, i).slice(),
                measureLabelz = measureLabels.call(this, d, i).slice();

            // Setup Scales
            // Compute the new x-scale.
            var x1 = d3.scale.linear()
                .domain( d3.extent(d3.merge([forceX, rangez, [d3.sum(measurez)]])) )
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
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            g.selectAll('rect.nv-range').data(rangez)
                .enter()
                .append('rect')
                .attr('class', 'nv-range');

            //gEnter.append('rect').attr('class', 'nv-measure');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var w0 = function (d) {
                    return Math.abs(x0(d) - x0(0))
                }, // TODO: could optimize by precalculating x0(0) and x1(0)
                w1 = function (d) {
                    return Math.abs(x1(d) - x1(0))
                };
            var xp0 = function (d) {
                    return d < 0 ? x0(d) : x0(0)
                },
                xp1 = function (d) {
                    return d < 0 ? x1(d) : x1(0)
                };

            g.selectAll('rect.nv-range')
                .attr('height', availableHeight)
                .attr('width', w1)
                .attr('x', xp1);

/*
            g.select('rect.nv-rangeAvg')
                .attr('height', availableHeight)
                .attr('width', w1(rangeAvg))
                .attr('x', xp1(rangeAvg))
                .datum(rangeAvg);

            g.select('rect.nv-rangeMin')
                .attr('height', availableHeight)
                .attr('width', w1(rangeMax))
                .attr('x', xp1(rangeMax))
                .attr('width', w1(rangeMax > 0 ? rangeMin : rangeMax))
                .attr('x', xp1(rangeMax > 0 ? rangeMin : rangeMax))
                .datum(rangeMax > 0 ? rangeMin : rangeMax);
*/

            g.selectAll('rect.nv-measure')
                .data(measurez)
                .enter()
                .append('rect')
                .attr('class', 'nv-measure');


            g.selectAll('rect.nv-measure')
                .style('fill', color)
                .attr('height', 20)
                .attr('y', function(d,i){ return i * 20; } )
                .attr('width', function(d){ return d < 0 ? x1(0) - x1(d) : x1(d) - x1(0); } )
                .attr('x', function(d,i){ return x1(i > 0 ? d3.sum(measurez.slice(0,i)) : 0); })
                .on('mouseover', function(d,i) {
                    dispatch.elementMouseover({
                        value: d,
                        label: measureLabelz[i] || 'Current',
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({
                        value: d,
                        label: measureLabelz[i] || 'Current',
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mouseout', function(d,i) {
                    dispatch.elementMouseout({
                        value: d,
                        label: measureLabelz[i] || 'Current',
                        color: d3.select(this).style("fill")
                    })
                });

            //var h3 =  availableHeight / 6;

            var markerData = markerz.map( function(marker, index) {
                return {value: marker, label: markerLabelz[index]}
            });
            gEnter
              .selectAll("line.nv-marker")
              .data(markerData)
              .enter()
              .append('line')
              .attr('class', 'nv-marker')
              /*.attr('d', 'M0,0 L' + (availableHeight/6)+ ',' + (availableHeight/2) + ' ' + (-availableHeight/6) + ',' + (availableHeight/2) + 'Z')*/
                /*.attr('r', 6 )*/
                .attr('x1', function(d){ return x1(d.value); })
                .attr('x2', function(d){ return x1(d.value); })
                .attr('y1', 0)
                .attr('y2', availableHeight)
/*              .on('mouseover', function(d) {
                dispatch.elementMouseover({
                  value: d.value,
                  label: d.label || 'Previous',
                  color: d3.select(this).style("fill"),
                  pos: [x1(d.value), availableHeight/2]
                })

              })
              .on('mousemove', function(d) {
                  dispatch.elementMousemove({
                      value: d.value,
                      label: d.label || 'Previous',
                      color: d3.select(this).style("fill")
                  })
              })
              .on('mouseout', function(d, i) {
                  dispatch.elementMouseout({
                      value: d.value,
                      label: d.label || 'Previous',
                      color: d3.select(this).style("fill")
                  })
              })*/;

            g.selectAll("circle.nv-markerTriangle")
              .data(markerData)
              .attr('transform', function(d) { return 'translate(' + x1(d.value) + ',' + (availableHeight / 2) + ')' });

            wrap.selectAll('.nv-range')
                .on('mouseover', function(d,i) {
                    dispatch.elementMouseover({
                        value: d,
                        label: rangeLabelz[i],
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({
                        value: d,
                        label: measureLabelz[i],
                        color: d3.select(this).style("fill")
                    })
                })
                .on('mouseout', function(d,i) {
                    //var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
                    dispatch.elementMouseout({
                        value: d,
                        label: rangeLabelz[i],
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


