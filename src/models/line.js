
nv.models.line = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var  scatter = nv.models.scatter()
        ;

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , container = null
        , strokeWidth = 1.5
        , negateTrend = false
        , color = nv.utils.defaultColor() // a function that returns a color
        , getX = function(d) { return d.x } // accessor to get the x value from a data point
        , getY = function(d) { return d.y } // accessor to get the y value from a data point
        , getLowBound = function(d) { return d.low } // accessor to get the low bound value from a data point
        , getHighBound = function(d) { return d.high } // accessor to get the high bound value from a data point
        , defined = function(d,i) { return !isNaN(getY(d,i)) && getY(d,i) !== null } // allows a line to be not continuous when it is not defined
        , forceY = [0, 1]
        , isArea = function(d) { return d.area } // decides if a line is an area or just a line
        , isBand = function(d) { return d.band  } // decides if a line is band
        , clipEdge = false // if true, masks lines within x and y scale
        , x //can be accessed via chart.xScale()
        , y //can be accessed via chart.yScale()
        , threshold = null // the threshold
        , active_since = null // active since
        , interpolate = "linear" // controls the line interpolation
        , duration = 0
        , dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout', 'renderEnd')
        ;

    scatter
        .pointSize(16) // default size
        .pointDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;

    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0 //used to store previous scales
        , renderWatch = nv.utils.renderWatch(dispatch, duration)
        ;

    //============================================================


    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(scatter);
        selection.each(function(data) {
            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);
            nv.utils.initSVG(container);

            var bandsForceY = data.reduce(function(res, d) {

                if (isBand(d)) {
                    return d3.extent(
                        d3.merge([res, d.values.reduce(function (rc, d) {
                            return d3.extent(d3.merge([rc, [getY(d), getLowBound(d), getHighBound(d)]]));
                        }, [])]));
                }

                return res;
            }, []);

            if (bandsForceY.length === 0) {
                bandsForceY = [0, 1];
            }

            // console.log('line chart', bandsForceY);
            scatter.forceY(d3.merge([bandsForceY, forceY || [0,1], [threshold]]));


            // Setup Scales
            x = scatter.xScale();
            y = scatter.yScale();

            x0 = x0 || x;
            y0 = y0 || y;

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-line').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-line');
            var defsEnter = wrapEnter.append('defs');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-groups');
            gEnter.append('g').attr('class', 'nv-scatterWrap');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            scatter
                .width(availableWidth)
                .height(availableHeight);

            var scatterWrap = wrap.select('.nv-scatterWrap');
            scatterWrap.call(scatter);

            defsEnter.append('clipPath')
                .attr('id', 'nv-edge-clip-' + scatter.id())
                .append('rect');

            wrap.select('#nv-edge-clip-' + scatter.id() + ' rect')
                .attr('width', availableWidth)
                .attr('height', (availableHeight > 0) ? availableHeight+50 : 0)
                .attr('y', (availableHeight > 0) ? -50 : 0);

            g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');
            scatterWrap
                .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');

            var groups = wrap.select('.nv-groups').selectAll('.nv-group')
                .data(function(d) { return d }, function(d) { return d.key });
            groups.enter().append('g')
                .style('stroke-opacity', 1e-6)
                .style('stroke-width', function(d) { return d.strokeWidth || strokeWidth })
                .style('fill-opacity', 1e-6);

            groups.exit().remove();

            groups
                .attr('class', function(d,i) {
                    return (d.classed || '') + ' nv-group nv-series-' + i;
                })
                .classed('hover', function(d) { return d.hover })
                .style('fill', function(d,i){ return color(d, i) })
                .style('stroke', function(d,i){ return color(d, i)});
            groups.watchTransition(renderWatch, 'line: groups')
                .style('stroke-opacity', 1)
                .style('fill-opacity', function(d) { return d.fillOpacity || .5});

            var areaPaths = groups.selectAll('path.nv-area')
                .data(function(d) { return isArea(d) ? [d] : [] }); // this is done differently than lines because I need to check if series is an area
            areaPaths.enter().append('path')
                .attr('class', 'nv-area')
                .attr('d', function(d) {
                    return d3.svg.area()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return nv.utils.NaNtoZero(x0(getX(d,i))) })
                        .y0(function(d,i) { return nv.utils.NaNtoZero(y0(getY(d,i))) })
                        .y1(function(d,i) { return y0( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
                        //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                        .apply(this, [d.values])
                });
            groups.exit().selectAll('path.nv-area')
                .remove();

            areaPaths.watchTransition(renderWatch, 'line: areaPaths')
                .attr('d', function(d) {
                    return d3.svg.area()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return nv.utils.NaNtoZero(x(getX(d,i))) })
                        .y0(function(d,i) { return nv.utils.NaNtoZero(y(getY(d,i))) })
                        .y1(function(d,i) { return y( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
                        //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                        .apply(this, [d.values])
                });

            var bandPaths = groups.selectAll('path.nv-band')
                .data(function(d) { return isBand(d) ? [d] : [] }); // this is done differently than lines because I need to check if series has bounds
            bandPaths.enter().append('path')
                .attr('class', 'nv-band')
                .attr('d', function(d) {
                    return d3.svg.area()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return nv.utils.NaNtoZero(x0(getX(d,i))) })
                        .y0(function(d,i) { return nv.utils.NaNtoZero(y0(getLowBound(d,i))) })
                        .y1(function(d,i) { return nv.utils.NaNtoZero(y0(getHighBound(d,i))) })
                        .apply(this, [d.values])
                });
            groups.exit().selectAll('path.nv-band')
                .remove();

            bandPaths.watchTransition(renderWatch, 'line: bandPaths')
                .attr('d', function(d) {
                    return d3.svg.area()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return nv.utils.NaNtoZero(x(getX(d,i))) })
                        .y0(function(d,i) { return nv.utils.NaNtoZero(y(getLowBound(d,i))) })
                        .y1(function(d,i) { return nv.utils.NaNtoZero(y(getHighBound(d,i))) })
                        .apply(this, [d.values])
                });

            var linePaths = groups.selectAll('path.nv-line')
                .data(function(d) { return [d.values] });

            linePaths.enter().append('path')
                .attr('class', 'nv-line')
                .attr('d',
                    d3.svg.line()
                    .interpolate(interpolate)
                    .defined(defined)
                    .x(function(d,i) { return nv.utils.NaNtoZero(x0(getX(d,i))) })
                    .y(function(d,i) { return nv.utils.NaNtoZero(y0(getY(d,i))) })
            );

            linePaths.watchTransition(renderWatch, 'line: linePaths')
                .attr('d',
                    d3.svg.line()
                    .interpolate(interpolate)
                    .defined(defined)
                    .x(function(d,i) { return nv.utils.NaNtoZero(x(getX(d,i))) })
                    .y(function(d,i) { return nv.utils.NaNtoZero(y(getY(d,i))) })
            );

            var thresholdPaths = groups.selectAll('line.nv-threshold')
                .data( threshold ? [threshold] : [] );

            thresholdPaths.enter().append('line')
                .attr('class', 'nv-threshold');

            thresholdPaths
                .attr('x1', x.range()[0])
                .attr('y1', nv.utils.NaNtoZero(y(threshold)))
                .attr('x2', x.range()[1])
                .attr('y2', nv.utils.NaNtoZero(y(threshold)));

            thresholdPaths.exit().remove();
/*
        <text x="0" y="338.85825396825396" transform="" style="
            fill: lightsteelblue;
            fill-opacity: 1;
            stroke-opacity: .2;
            transform: rotate(270deg );
            text-anchor: end;
            stroke: lightsteelblue;
            font-size: 11px;
            ">Created</text>*/

            var activeMarker = groups.selectAll('g.nv-activeMarker')
                .data( active_since ? [active_since] : [] );

            var activeMarkerEnter = activeMarker.enter().append('g')
                .attr('class', 'nv-activeMarker');

            activeMarkerEnter.append('line');
            activeMarkerEnter.append('text');

            activeMarker.selectAll('line')
                .attr('x1', nv.utils.NaNtoZero(x(active_since)))
                .attr('y1', y.range()[0])
                .attr('x2', nv.utils.NaNtoZero(x(active_since)))
                .attr('y2', y.range()[1] );

            activeMarker.selectAll('text')
                .text('Created'/*function(d){
                    return 'create on ' + d3.time.format('%b %d %H:%M')(new Date(+d));
                }*/)
                .attr('transform', 'rotate(270)')
                .attr('y', nv.utils.NaNtoZero(x(active_since)) - 5)
                .attr('x', -availableHeight / 2);

            activeMarker.exit().remove();

        //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
        });
        renderWatch.renderEnd('line immediate');
        return chart;
    }


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.scatter = scatter;
    // Pass through events
    scatter.dispatch.on('elementClick', function(){ dispatch.elementClick.apply(this, arguments); });
    scatter.dispatch.on('elementMouseover', function(){ dispatch.elementMouseover.apply(this, arguments); });
    scatter.dispatch.on('elementMouseout', function(){ dispatch.elementMouseout.apply(this, arguments); });

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        defined: {get: function(){return defined;}, set: function(_){defined=_;}},
        negateTrend: {get: function(){return negateTrend;}, set: function(_){negateTrend=_;}},
        forceY: {
            get: function () {
                return forceY;
            }, set: function (_) {
                forceY = _;
            }
        },
        interpolate:      {get: function(){return interpolate;}, set: function(_){interpolate=_;}},
        threshold:      {get: function(){return threshold;}, set: function(_){threshold=_;}},
        activeSince:      {get: function(){return active_since;}, set: function(_){active_since=_;}},
        clipEdge:    {get: function(){return clipEdge;}, set: function(_){clipEdge=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            scatter.duration(duration);
        }},
        isArea: {get: function(){return isArea;}, set: function(_){
                isArea = d3.functor(_);
            }},
        isBand: {get: function(){return isBand;}, set: function(_){
                isBand = d3.functor(_);
            }},
        x: {get: function(){return getX;}, set: function(_){
            getX = _;
            scatter.x(_);
        }},
        y: {get: function(){return getY;}, set: function(_){
                getY = _;
                scatter.y(_);
            }},
        low: {get: function(){return getLowBound;}, set: function(_){
                getLowBound = _;
                scatter.low(_);
            }},
        high: {get: function(){return getHighBound;}, set: function(_){
                getHighBound = _;
                scatter.high(_);
            }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            scatter.color(color);
        }}
    });

    nv.utils.inheritOptions(chart, scatter);
    nv.utils.initOptions(chart);

    return chart;
};
