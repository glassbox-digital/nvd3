// based on http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
nv.models.trend = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = null
        , height = null
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , color = nv.utils.defaultColor()
        , font = 'serif'
    //, groupColorByParent = true
        , duration = 500
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMousemove', 'elementMouseover', 'elementMouseout', 'renderEnd')
        , format = function (d) { return d3.format(",.0f")(d) + " TWh"; }
        ;

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();

        selection.each(function(data) {
            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin);
            var availableHeight = nv.utils.availableHeight(height, container, margin);

            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-trend').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-trend nv-chart-' + id);

            var g = container.selectAll('.nv-wrap.nv-trend');

            function addAxesAndLegend (svg, xAxis, yAxis, margin, chartWidth, chartHeight) {
                var legendWidth  = 200,
                    legendHeight = 100;

                // clipping to make sure nothing appears behind legend
                svg.append('clipPath')
                    .attr('id', 'axes-clip')
                    .append('polygon')
                    .attr('points', (-margin.left)                 + ',' + (-margin.top)                 + ' ' +
                    (chartWidth - legendWidth - 1) + ',' + (-margin.top)                 + ' ' +
                    (chartWidth - legendWidth - 1) + ',' + legendHeight                  + ' ' +
                    (chartWidth + margin.right)    + ',' + legendHeight                  + ' ' +
                    (chartWidth + margin.right)    + ',' + (chartHeight + margin.bottom) + ' ' +
                    (-margin.left)                 + ',' + (chartHeight + margin.bottom));

                var axes = svg.append('g')
                    .attr('clip-path', 'url(#axes-clip)');

                axes.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + chartHeight + ')')
                    .call(xAxis);

                axes.append('g')
                    .attr('class', 'y axis')
                    .call(yAxis)
                    .append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .text('Time (s)');

                var legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', 'translate(' + (chartWidth - legendWidth) + ', 0)');

                legend.append('rect')
                    .attr('class', 'legend-bg')
                    .attr('width',  legendWidth)
                    .attr('height', legendHeight);

                legend.append('rect')
                    .attr('class', 'outer')
                    .attr('width',  75)
                    .attr('height', 20)
                    .attr('x', 10)
                    .attr('y', 10);

                legend.append('text')
                    .attr('x', 115)
                    .attr('y', 25)
                    .text('5% - 95%');

                legend.append('rect')
                    .attr('class', 'inner')
                    .attr('width',  75)
                    .attr('height', 20)
                    .attr('x', 10)
                    .attr('y', 40);

                legend.append('text')
                    .attr('x', 115)
                    .attr('y', 55)
                    .text('25% - 75%');

                legend.append('path')
                    .attr('class', 'median-line')
                    .attr('d', 'M10,80L85,80');

                legend.append('text')
                    .attr('x', 115)
                    .attr('y', 85)
                    .text('Median');
            }

            function drawPaths (svg, data, x, y) {
                var upperOuterArea = d3.svg.area()
                    .interpolate('basis')
                    .x (function (d) { return x(d.date) || 1; })
                    .y0(function (d) { return y(d.pct95); })
                    .y1(function (d) { return y(d.pct75); });

                var upperInnerArea = d3.svg.area()
                    .interpolate('basis')
                    .x (function (d) { return x(d.date) || 1; })
                    .y0(function (d) { return y(d.pct75); })
                    .y1(function (d) { return y(d.pct50); });

                var medianLine = d3.svg.line()
                    .interpolate('basis')
                    .x(function (d) { return x(d.date); })
                    .y(function (d) { return y(d.pct50); });

                var lowerInnerArea = d3.svg.area()
                    .interpolate('basis')
                    .x (function (d) { return x(d.date) || 1; })
                    .y0(function (d) { return y(d.pct50); })
                    .y1(function (d) { return y(d.pct25); });

                var lowerOuterArea = d3.svg.area()
                    .interpolate('basis')
                    .x (function (d) { return x(d.date) || 1; })
                    .y0(function (d) { return y(d.pct25); })
                    .y1(function (d) { return y(d.pct05); });

                svg.datum(data);

                svg.append('path')
                    .attr('class', 'area upper outer')
                    .attr('d', upperOuterArea)
                    .attr('clip-path', 'url(#rect-clip)');

                svg.append('path')
                    .attr('class', 'area lower outer')
                    .attr('d', lowerOuterArea)
                    .attr('clip-path', 'url(#rect-clip)');

                svg.append('path')
                    .attr('class', 'area upper inner')
                    .attr('d', upperInnerArea)
                    .attr('clip-path', 'url(#rect-clip)');

                svg.append('path')
                    .attr('class', 'area lower inner')
                    .attr('d', lowerInnerArea)
                    .attr('clip-path', 'url(#rect-clip)');

                svg.append('path')
                    .attr('class', 'median-line')
                    .attr('d', medianLine)
                    .attr('clip-path', 'url(#rect-clip)');
            }

            function addMarker (marker, svg, chartHeight, x) {
                var radius = 32,
                    xPos = x(marker.date) - radius - 3,
                    yPosStart = chartHeight - radius - 3,
                    yPosEnd = (marker.type === 'Client' ? 80 : 160) + radius - 3;

                var markerG = svg.append('g')
                    .attr('class', 'marker '+marker.type.toLowerCase())
                    .attr('transform', 'translate(' + xPos + ', ' + yPosStart + ')')
                    .attr('opacity', 0);

                markerG.transition()
                    .duration(1000)
                    .attr('transform', 'translate(' + xPos + ', ' + yPosEnd + ')')
                    .attr('opacity', 1);

                markerG.append('path')
                    .attr('d', 'M' + radius + ',' + (chartHeight-yPosStart) + 'L' + radius + ',' + (chartHeight-yPosStart))
                    .transition()
                    .duration(1000)
                    .attr('d', 'M' + radius + ',' + (chartHeight-yPosEnd) + 'L' + radius + ',' + (radius*2));

                markerG.append('circle')
                    .attr('class', 'marker-bg')
                    .attr('cx', radius)
                    .attr('cy', radius)
                    .attr('r', radius);

                markerG.append('text')
                    .attr('x', radius)
                    .attr('y', radius*0.9)
                    .text(marker.type);

                markerG.append('text')
                    .attr('x', radius)
                    .attr('y', radius*1.5)
                    .text(marker.version);
            }

            function startTransitions (svg, chartWidth, chartHeight, rectClip, markers, x) {
                rectClip.transition()
                    .duration(1000*markers.length)
                    .attr('width', chartWidth);

                markers.forEach(function (marker, i) {
                    setTimeout(function () {
                        addMarker(marker, svg, chartHeight, x);
                    }, 1000 + 500*i);
                });
            }

            function makeChart (svg, series, markers) {
                var chartWidth  = availableWidth,
                    chartHeight = availableHeight;

                var x = d3.time.scale().range([0, chartWidth])
                        .domain(d3.extent(series, function (d) { return d.date; })),
                    y = d3.scale.linear().range([chartHeight, 0])
                        .domain([0, d3.max(series, function (d) { return d.pct95; })]);

                var xAxis = d3.svg.axis().scale(x).orient('bottom')
                        .innerTickSize(-chartHeight).outerTickSize(0).tickPadding(10),
                    yAxis = d3.svg.axis().scale(y).orient('left')
                        .innerTickSize(-chartWidth).outerTickSize(0).tickPadding(10);

                // clipping to start chart hidden and slide it in later
                var rectClip = svg.append('clipPath')
                    .attr('id', 'rect-clip')
                    .append('rect')
                    .attr('width', 0)
                    .attr('height', chartHeight);

                addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
                drawPaths(svg, series, x, y);
                startTransitions(svg, chartWidth, chartHeight, rectClip, markers, x);
            }

            if (data.series && data.series.length){
                makeChart(g, data.series, data.markers);
            }

            chart.update = function() {

                if ( duration === 0 ) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };

            chart.container = this;

            //g.attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

        });

        renderWatch.renderEnd('trend immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        font:       {get: function(){return font;}, set: function(_){font=_;}},
        id:         {get: function(){return id;}, set: function(_){id=_;}},
        duration:   {get: function(){return duration;}, set: function(_){duration=_;}},
        groupColorByParent: {get: function(){return groupColorByParent;}, set: function(_){groupColorByParent=!!_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    != undefined ? _.top    : margin.top;
            margin.right  = _.right  != undefined ? _.right  : margin.right;
            margin.bottom = _.bottom != undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   != undefined ? _.left   : margin.left;
        }},
        color: {get: function(){return color;}, set: function(_){
            color=nv.utils.getColor(_);
        }},
        format: {get: function(){return format;}, set: function(_){
            format=d3.functor(_);
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
