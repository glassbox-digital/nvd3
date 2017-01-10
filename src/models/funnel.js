
nv.models.funnel = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , x = d3.scale.ordinal()
        , y = d3.scale.linear()
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , getY2 = function(d) {}
        , getYC = function(d) { return 0; }
        , getYerr = function(d) { return d.yErr }
        , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
        , color = nv.utils.defaultColor()
        , href = null
        , barWidth = 50
        , barColor = null // adding the ability to set the color for each rather than the whole group
        , disabled // used in conjunction with barColor to communicate from funnelChart what series are disabled
        , stacked = false
        , showValues = false
        , showBarLabels = true
        , showChecks = false
        , showDropoff = true
        , valuePadding = 60
        , groupSpacing = 0.1
        , valueFormat = d3.format(',.2f')
        , delay = 1200
        , xDomain
        , yDomain
        , xRange
        , yRange
        , duration = 250
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0; //used to store previous scales
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            if (stacked)
                data = d3.layout.stack()
                    .offset('zero')
                    .values(function(d){ return d.values })
                    .y(getY)
                (data);

            //add series index and key to each data point for reference
            data.forEach(function(series, i) {
                series.values.forEach(function(point) {
                    point.series = i;
                    point.key = series.key;
                });
            });

            // HACK for negative value stacking
            if (stacked)
                data[0].values.map(function(d,i) {
                    var posBase = 0, negBase = 0;
                    data.map(function(d) {
                        var f = d.values[i]
                        f.size = Math.abs(f.y);
                        if (f.y<0)  {
                            f.y1 = negBase - f.size;
                            negBase = negBase - f.size;
                        } else
                        {
                            f.y1 = posBase;
                            posBase = posBase + f.size;
                        }
                    });
                });

            // Setup Scales
            // remap and flatten the data for use in calculating the scales' domains
            var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
                data.map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d,i), y: getY(d,i), y0: d.y0, y1: d.y1 }
                    })
                });

            x.domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
                .rangeBands(xRange || [0, availableHeight], groupSpacing);

            y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return stacked ? (d.y > 0 ? d.y1 + d.y : d.y1 ) : d.y }).concat(forceY)))

            if (showValues && !stacked)
                y.range(yRange || [(y.domain()[0] < 0 ? valuePadding : 0), availableWidth - (y.domain()[1] > 0 ? valuePadding : 0) ]);
            else
                y.range(yRange || [showChecks ? 30 : 0, availableWidth-50]);

            x0 = x0 || x;
            y0 = y0 || d3.scale.linear().domain(y.domain()).range([y(0),y(0)]);

            // Setup containers and skeleton of chart
            var wrap = d3.select(this).selectAll('g.nv-wrap.nv-funnel').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-funnel');
            var defsEnter = wrapEnter.append('defs');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-groups');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var groups = wrap.select('.nv-groups').selectAll('.nv-group')
                .data(function(d) { return d }, function(d,i) { return i });
            groups.enter().append('g')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6);
            groups.exit().watchTransition(renderWatch, 'funnel: exit groups')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6)
                .remove();
            groups
                .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
                .classed('hover', function(d) { return d.hover })
                .style('fill', function(d,i){ return color(d, i) })
                .style('stroke', function(d,i){ return color(d, i) });
            groups.watchTransition(renderWatch, 'funnel: groups')
                .style('stroke-opacity', 1)
                .style('fill-opacity', .75);

            var bars = groups.selectAll('g.nv-bar')
                .data(function(d) { return d.values });

            bars.exit().remove();

            var barsEnter = bars.enter().append('g')
                .attr('transform', function(d,i,j) {
                    return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + (stacked ? 0 : (j * x.rangeBand() / data.length ) + x(getX(d,i))) + ')'
                });

            function draw_rect(w,w1,h){
                return [
                    'M', 0, 0,
                    'H', w,
                    'L', w-w1, h,
                    'H', 0,
                    'Z'

                ].join(' ');
            }

            barsEnter.append('path')
                .attr('class', 'nv-bar-rect');
                /*.attr('height', barWidth || x.rangeBand() / (stacked ? 1 : data.length) )*/

            barsEnter.append('path')
                .attr('class', 'nv-bar-arrow');

            if ( showDropoff ) {
                var gDropoffEnter = barsEnter.append('g')
                    .attr('class', 'nv-dropoff');

                gDropoffEnter.append('path')
                    .attr('class', 'nv-reducer');
                gDropoffEnter.append('path')
                    .attr('class', 'nv-reducer-arrow');

                if ( showValues ) {
                    gDropoffEnter.append('text')
                        .attr('class', 'nv-reducer-value');
                    gDropoffEnter.append('text')
                        .attr('class', 'nv-reducer-ratio');
                }

                gDropoffEnter.on('click', function(d,i){
                    var reducer = true;
/*
                    d.selected = d.selected === 'reduce' ? '' : 'reduce';
                    d3.select(this.parentNode)
                        .classed('selected', d.selected === 'select')
                        .classed('reduced', d.selected === 'reduce')
                        .select('.nv-check')
                        .attr('d', function (d) {
                            return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                                d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                    'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                        });
*/

                    dispatch.elementClick({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this.parentNode).style("fill")
                    });

                    d3.event.stopPropagation();


                });
            }

            if (showChecks) {
                var checks = barsEnter.append('path')
                    .attr('class', 'nv-check')
                    .attr('d', function (d) {
                        return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                            d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                    });

                checks.on('click', function (d, i) {
                    d.selected = d.selected === 'select' ? 'reduce' : d.selected === 'reduce' ? '' : 'select';

                    d3.select(this.parentNode)
                        .classed('selected', d.selected === 'select')
                        .classed('reduced', d.selected === 'reduce')
                        .select('.nv-check')
                        .attr('d', function (d) {
                            return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                                d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                    'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                        });

                    dispatch.elementClick({
                        data: d,
                        index: i,
                        selected: d.selected,
                        color: d3.select(this.parentNode).style("fill")
                    });

                    d3.event.stopPropagation();
                });
            }

            bars
                .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
                    var reducer = d3.select(d3.event.target.parentNode).classed('nv-dropoff');
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this).style("fill")
                    });
                })
                .on('mouseout', function(d,i) {
                    var reducer = d3.select(d3.event.target.parentNode).classed('nv-dropoff');
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this).style("fill")
                    });
                })
                .on('mousemove', function(d,i) {
                    var reducer = d3.select(d3.event.target.parentNode).classed('nv-dropoff');
                    dispatch.elementMousemove({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this).style("fill")
                    });
                })
                .on('dblclick', function (d, i) {
                    var reducer = d3.select(d3.event.target.parentNode).classed('nv-dropoff');
                    dispatch.elementDblClick({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this).style("fill")
                    });
                    d3.event.stopPropagation();
                })
                .on('click', function (d, i) {
                    var reducer = false;
/*
                    d.selected = d.selected === 'select' ? '' : 'select';

                    d3.select(this)
                        .classed('selected', d.selected === 'select')
                        .classed('reduced', d.selected === 'reduce')
                        .select('.nv-check')
                        .attr('d', function (d) {
                            return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                                d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                    'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                        });
*/


                    dispatch.elementClick({
                        data: d,
                        index: i,
                        reducer: reducer,
                        color: d3.select(this).style("fill")
                    });

                    d3.event.stopPropagation();
                });


            if (getYerr(data[0],0)) {
                barsEnter.append('polyline');

                bars.select('polyline')
                    .attr('fill', 'none')
                    .attr('points', function(d,i) {
                        var xerr = getYerr(d,i)
                            , mid = 0.8 * x.rangeBand() / ((stacked ? 1 : data.length) * 2);
                        xerr = xerr.length ? xerr : [-Math.abs(xerr), Math.abs(xerr)];
                        xerr = xerr.map(function(e) { return y(e) - y(0); });
                        var a = [[xerr[0],-mid], [xerr[0],mid], [xerr[0],0], [xerr[1],0], [xerr[1],-mid], [xerr[1],mid]];
                        return a.map(function (path) { return path.join(',') }).join(' ');
                    })
                    .attr('transform', function(d,i) {
                        var mid = x.rangeBand() / ((stacked ? 1 : data.length) * 2);
                        return 'translate(' + (getY(d,i) < 0 ? 0 : y(getY(d,i)) - y(0)) + ', ' + mid + ')'
                    });
            }



            if (showValues /*&& !stacked*/) {
                barsEnter.append('text').classed('nv-bar-value', true);

                bars.select('text.nv-bar-value')
                    .attr('text-anchor', 'start' )
                    .attr('y', 10)
                    .attr('dy', '.32em')
                    .attr('dx', '.32em')
                    .text(function(d,i) {
                        var t = valueFormat(getY(d,i))
                            , yerr = getYerr(d,i);

                        if (yerr === undefined)
                            return t;
                        if (!yerr.length)
                            return t + '±' + valueFormat(Math.abs(yerr));
                        return t + '+' + valueFormat(Math.abs(yerr[1])) + '-' + valueFormat(Math.abs(yerr[0]));
                    });

                barsEnter.append('text').classed('nv-bar-value2', true);

                bars.select('text.nv-bar-value2')
                    .attr('text-anchor', 'start' )
                    .attr('y', 10)
                    .attr('dy', '.32em')
                    .attr('dx', '3.32em')
                    .text(function(d,i) {
                        var t = valueFormat(getY2(d,i));

                        return t;
                    });

                barsEnter.append('text').classed('nv-continue-ratio', true);

                bars.select('text.nv-continue-ratio')
                    .attr('text-anchor', 'start' )
                    .attr('y', barWidth)
                    .attr('dy', '1.32em')
                    .attr('dx', '33')
                    .style('fill', 'auto')
                    .text(function(d,i) {
                        var v = getY(d,i),
                            vc = getYC(d,i),
                            t = v > 0 ? d3.format('.1%')(1 - vc/v) : '';
                        return t;
                    });


                /*
                                bars.watchTransition(renderWatch, 'funnel: bars')
                                    .select('text')
                                    .attr('x', function(d,i) { return getY(d,i) < 0 ? y(0) -y(getY(d,i)) - 4 : + 4 })
                */

                bars.select('text.nv-reducer-value')
                    .attr('text-anchor', 'start')
                    .attr('y', 10)
                    .attr('dy', '.32em')
                    .text(function(d,i) {
                        var v = getY(d,i),
                            vc = getYC(d,i),
                            t = vc > 0 ? valueFormat(getYC(d,i)): '';

                        return t;
                    });

                bars.select('text.nv-reducer-ratio')
                    .attr('text-anchor', 'start')
                    .attr('y', barWidth - 10)
                    .attr('dy', '.32em')
                    .text(function(d,i) {
                        var v = getY(d,i),
                            vc = getYC(d,i),
                            t = v > 0 && vc > 0 ? d3.format('.1%')(vc/v) : '';
                        return t;
                    });

                bars.watchTransition(renderWatch, 'funnel: bars')
                    .select('text')
                    .attr('x', function(d,i) { return y(getY(d,i)) - (showChecks ? 30 : 0) - 4 })

                bars.watchTransition(renderWatch, 'funnel: bars')
                    .selectAll('g.nv-dropoff text')
                    .attr('x', function(d,i) { return y(getY(d,i)) - (showChecks ? 30 : 0) + 16 })

            } else {
                bars.selectAll('text.nv-bar-value').remove();
                bars.selectAll('text.nv-bar-value2').remove();
                bars.selectAll('text.nv-reducer-value').remove();
                bars.selectAll('text.nv-reducer-ratio').remove();
            }

            if (showBarLabels /*&& !stacked*/) {

                if (href && typeof href === 'function') {
                    var a = barsEnter
                        .append('a').attr('class', 'nv-href').attr('xlink:href', function (d) {
                            return href(d);
                        });

                    a.append('text').classed('nv-bar-label', true);

                    a.on('mouseover', function (d, i) {
                        d3.event.stopPropagation();
                        d3.event.preventDefault();

                        //d3.select(this).classed('hover', true).style('opacity', 0.8);
                        dispatch.elementMouseout({
                            data: d
                        });

                    });

                    /*a.append('path').attr('d', 'M 10 6 L 8.59 7.41 L 13.17 12 l -4.58 4.59 L 10 18 l 6 -6 Z');*/
                }
                else {
                    barsEnter.append('text').classed('nv-bar-label', true);
                }

                bars.select('text.nv-bar-label')
                    .attr('text-anchor', function(d,i) { return (getY(d,i) >= 0) ? 'start' : 'end' })
                    .attr('y', barWidth ? (barWidth-10) : (x.rangeBand() / (data.length * 2)))
                    .attr('dx', '.32em')
                    .attr('dy', '.1em')
                    .text(function(d,i) { return getX(d,i) });

/*
                {
                    bars
                        .watchTransition(renderWatch, 'funnel: bars')
                        .select('text.nv-bar-label')
                        .attr('x', 4);
                }
*/


                if ( stacked ) {
                    bars.filter(function (d) {
                        return d.series > 0;
                    }).select('text.nv-bar-label').remove();
                }
            }
            else {
                bars.selectAll('text.nv-bar-label').remove();
            }

            bars
                .attr('class', function(d,i) { var y = getY(d,i); return y === 0 ? 'nv-bar zero' : (y < 0 ? 'nv-bar negative' : 'nv-bar positive'); });

            bars.classed('selected', function(d,i){ return d.selected === 'select'; })
                .classed('reduced', function(d,i){ return d.selected === 'reduce'; });

            if (barColor) {

                var selected = bars.data().filter(function(d){
                    return !!d.selected;
                });

                if ( selected && selected.length > 0 ){
                    bars.selectAll('.nv-bar-rect')
                        .style('opacity', function(d,i){
                            return d.selected ? 1 : 0.1;
                        });

                    bars.selectAll('.nv-bar-arrow')
                        .style('opacity', function(d,i){
                            return d.selected === 'select' ? 1 : 0.1;
                        });

                    bars.selectAll('.nv-dropoff')
                        .style('opacity', function(d,i){
                            return d.selected === 'reduce' ? 1 : 0.1;
                        });

                    /*bars.style('filter', function(d){
                        return d.selected === 'reduce' || d.selected === 'select' ? 'url(#drop-shadow)' : '';
                    });*/

                    bars.selectAll('text')
                        .style('fill-opacity', function(d){
                            return d.selected === 'reduce' || d.selected === 'select' ? null : 0.2;
                        })
                        .style('stroke-opacity', function(d){
                            return d.selected === 'reduce' || d.selected === 'select' ? null : 0.2;
                        });
                }
                else {
                    bars.selectAll('.nv-bar-rect')
                        .style('opacity', 'auto');

                    bars.selectAll('.nv-bar-arrow')
                        .style('opacity', 'auto');

                    bars.selectAll('.nv-dropoff')
                        .style('opacity', 'auto');

                    // bars.style('filter', '');

                    bars.selectAll('text')
                        .style('fill-opacity', '')
                        .style('stroke-opacity', '');


                }

                if (!disabled) disabled = data.map(function() { return true });
                bars
                    .style('fill', function (d, i, j) {
                        return d3.rgb(barColor(d, i)).darker(disabled.map(function (d, i) {
                            return i
                        }).filter(function (d, i) {
                            return !disabled[i]
                        })[j]).toString();
                    });


                    //.style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(  disabled.map(function(d,i) { return i }).filter(function(d,i){ return !disabled[i]  })[j]   ).toString(); });
            }

            var prev = 0;
            bars.data().forEach(function(d,i){
                prev += i > 0 ? getYC(bars.data()[i-1]) : 0;
                d.prev = prev;
            });

            function arrow(x,y){
                x = Math.round(x,1);
                y = Math.round(y,1);

                return [
                    'M',x,y,
                    'V',y+3,
                    'q',1,-6,8,-6,
                    'V',y-8,
                    'L',x+15,y,
                    'L',x+8,y+8,
                    'V',y+3,
                    'q',-7,0,-8,3,
                    'Z'].join(' ');

            }

            function arrow_down(x,y){
                x = Math.round(x,1);
                y = Math.round(y,1);

                return ['M', x, y,
                    'H', x - 3,
                    'V', y + 12,
                    'H', x - 8,
                    'L', x, y + 21,
                    'L', x + 8, y + 12,
                    'H', x + 3,
                    'V', y,
                    'Z'].join(' ');
            }


            function reducer(w, w1, h){
                return ['M', w, 0,
                    'V', h,
                    'H', Math.round(w-w1,1),
                    'Z'].join(' ');
            }

            if (stacked) {
                var watch = bars.watchTransition(renderWatch, 'funnel: bars')
                    .attr('transform', function (d, i) {
                        var x1 = i * (barWidth + 21) + x.range()[0];
                        return 'translate(' + y(d.y1 /*+ d.prev/2*/) + ',' + x1 /*x(getX(d, i))*/ + ')'
                    });

                watch.select('.nv-bar-rect')
                    .attr('d', function (d, i) {
                        var w = Math.abs(y(getY(d, i) + d.y0) - y(d.y0)) || 0,
                            w1 = Math.abs(y(getYC(d,i) + d.y0) - y(d.y0)) || 0,
                            h = barWidth || x.rangeBand();

                        var wf = Math.max(70, w),
                            w1f = w > 0? wf / w * w1 : wf;

                        return draw_rect(wf,w1f,h);

                    });
                    /*.attr('height', barWidth || x.rangeBand());*/

                if ( showChecks ) {
                    watch.select('path.nv-check')
                        .attr('transform', function (d, i) {
                            var width = Math.abs(y(getY(d, i) + d.y0) - y(d.y0)),
                                w1 = Math.abs(y(getYC(d, i) + d.y0) - y(d.y0)),
                                height = barWidth || x.rangeBand();
                            return 'translate(-30,' + (height - 24) / 2 + ' )';
                        })
                        .attr('d', function(d){
                            return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                                d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                    'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                        });
                }

                watch.select('path.nv-bar-arrow')
                    .attr('d', function (d, i) {

                        var h = barWidth || x.rangeBand();

                        return arrow_down(20,h);
                    });


                watch.select('path.nv-reducer')
                    .attr('d', function (d, i) {

                        var w = Math.abs(y(getY(d, i) + d.y0) - y(d.y0)) || 0,
                            w1 = Math.abs(y(getYC(d, i) + d.y0) - y(d.y0)) || 0,
                            h = barWidth || x.rangeBand();

                        var wf = Math.max(70, w),
                            w1f = w > 0? wf / w * w1 : wf;

                        return reducer(wf, w1f, h);
                    })
                    .attr('opacity', function (d, i) {
                        var v = getYC(d, i);
                        return v > 0 ? 1 : 0;
                    });

                watch.select('path.nv-reducer-arrow')
                    .attr('d', function (d, i) {
                        var w = Math.abs(y(getY(d, i) + d.y0) - y(d.y0)) || 0,
                            h = barWidth || x.rangeBand();

                        w = Math.max(70, w);
                        return arrow(w,h/2);
                    })
                    .style('visibility', function(d,i){
                        var v = getYC(d, i);
                        return v > 0 ? 'visible' : 'hidden';
                    });

            }
            else {

                var watch = bars.watchTransition(renderWatch, 'funnel: bars')
                    .attr('transform', function (d, i) {
                        //TODO: stacked must be all positive or all negative, not both?
                        return 'translate(' +
                            (getY(d, i) < 0 ? y(getY(d, i)) : y(0 /*+ d.prev/2*/) )
                            + ',' +
                            (d.series * x.rangeBand() / data.length
                            +
                            x(getX(d, i)) )
                            + ')'
                    });

                watch
                    .select('.nv-bar-rect')
                    .attr('d', function(d){
                        var h = barWidth || x.rangeBand() / data.length,
                            w1 = Math.max(Math.abs(y(getYC(d, i)) - y(0)), 1) || 0,
                            w = Math.max(Math.abs(y(getY(d, i)) - y(0)), 1) || 0;

                        var wf = Math.max(70, w),
                            w1f = w > 0? wf / w * w1 : wf;

                        return draw_rect(wf,w1f,h);
                    });

/*
                    .attr('height', barWidth || x.rangeBand() / data.length)
                    .attr('width', function (d, i) {
                        return Math.max(Math.abs(y(getY(d, i)) - y(0)), 1) || 0
                    });
*/

                if ( showChecks ) {
                    watch.select('path.nv-check')
                        .attr('transform', function (d, i) {
                            var width = Math.max(Math.abs(y(getY(d, i)) - y(0)), 1),
                                height = barWidth || x.rangeBand() / data.length;
                            return 'translate(' + (width - 20) + ',' + (height - 20) / 2 + ' )';
                        })
                        .attr('d', function (d) {
                            return d.selected === 'select' ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' :
                                d.selected === 'reduce' ? 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H7V11H17V13Z' :
                                    'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';
                        });
                }

                watch.select('path.nv-bar-arrow')
                    .attr('d', function (d, i) {

                        var h = barWidth || x.rangeBand();
                        return arrow_down(20,h);
                    });


                watch.select('path.nv-reducer')
                    .attr('d', function (d, i) {

                        var w = Math.abs(y(getY(d, i) + d.y0) - y(d.y0)) || 0,
                            w1 = Math.abs(y(getYC(d, i) + d.y0) - y(d.y0)) || 0,
                            h = barWidth || x.rangeBand();

                        var wf = Math.max(70, w),
                            w1f = w > 0? wf / w * w1 : wf;

                        return reducer(wf,w1f,h);
                    });


            }

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();

        });

        renderWatch.renderEnd('funnel immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:   {get: function(){return width;}, set: function(_){width=_;}},
        height:  {get: function(){return height;}, set: function(_){height=_;}},
        x:       {get: function(){return getX;}, set: function(_){getX=_;}},
        y:       {get: function(){return getY;}, set: function(_){getY=_;}},
        y2:       {get: function(){return getY2;}, set: function(_){getY2=_;}},
        yc:       {get: function(){return getYC;}, set: function(_){getYC=_;}},
        yErr:       {get: function(){return getYerr;}, set: function(_){getYerr=_;}},
        xScale:  {get: function(){return x;}, set: function(_){x=_;}},
        yScale:  {get: function(){return y;}, set: function(_){y=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        forceY:  {get: function(){return forceY;}, set: function(_){forceY=_;}},
        stacked: {get: function(){return stacked;}, set: function(_){stacked=_;}},
        showValues: {get: function(){return showValues;}, set: function(_){showValues=_;}},
        // this shows the group name, seems pointless?
        showBarLabels:    {get: function(){return showBarLabels;}, set: function(_){showBarLabels=_;}},
        showChecks:    {get: function(){return showChecks;}, set: function(_){showChecks=false;}},
        disabled:     {get: function(){return disabled;}, set: function(_){disabled=_;}},
        id:           {get: function(){return id;}, set: function(_){id=_;}},
        valueFormat:  {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        valuePadding: {get: function(){return valuePadding;}, set: function(_){valuePadding=_;}},
        groupSpacing:{get: function(){return groupSpacing;}, set: function(_){groupSpacing=_;}},

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
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }},
        href:  {get: function(){return href;}, set: function(_){
            href = d3.functor(_);
        }},
        barColor:  {get: function(){return barColor;}, set: function(_){
            barColor = _ ? nv.utils.getColor(_) : null;
        }},
        barWidth: {get: function(){return barWidth;}, set: function(_){ barWidth = _; }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
