
nv.models.discreteBarChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var discretebar = nv.models.discreteBar()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend()
        , tooltip = nv.models.tooltip()
        ;

    var margin = {top: 15, right: 10, bottom: 50, left: 90}
        , width = null
        , height = null
        , color = nv.utils.getColor()
        , showLegend = false
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , staggerLabels = false
        , wrapLabels = false
        , rotateLabels = 0
        , x
        , y
        , noData = null
        , dispatch = d3.dispatch('beforeUpdate','renderEnd', 'selectChange')
        , duration = 250
        ;

    xAxis
        .orient('bottom')
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .tickFormat(d3.format(',.1f'))
    ;

    tooltip
        .duration(0)
        .headerEnabled(false)
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        })
        .keyFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        });

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch, duration);
    var chartHeight = 125;
    var layoutGap = 10;
    var scrollClass = 'nv-chartScrollHorizontal';

    function isChartScroll(node) {
        return !!(node && node.classList &&
            node.classList.contains(scrollClass));
    }

    function getWidgetNode(svgNode) {
        var parent = svgNode.parentNode;
        return isChartScroll(parent) ? parent.parentNode : parent;
    }

    function setChartScroll(svgNode, enabled, blockHeight) {
        var parent = svgNode.parentNode;

        if (!enabled) {
            if (isChartScroll(parent)) {
                parent.parentNode.insertBefore(svgNode, parent);
                parent.parentNode.removeChild(parent);
            }
            return;
        }

        var scrollNode = parent;
        if (!isChartScroll(parent)) {
            scrollNode = document.createElement('div');
            scrollNode.className = scrollClass;
            parent.insertBefore(scrollNode, svgNode);
            scrollNode.appendChild(svgNode);
        }

        d3.select(scrollNode)
            .style('height', (blockHeight + layoutGap) + 'px')
            .style('overflow-x', 'auto');
    }

    function getBarColor(bar, i) {
        var barColorFn = discretebar.barColor();
        if (barColorFn) {
            return d3.rgb(barColorFn(bar, i)).toString();
        }
        return bar.color || discretebar.color()(bar, i);
    }

    function barAccessorValue(bar, accessor, tupleIndex) {
        var value = accessor(bar);
        if (value !== undefined) {
            return value;
        }
        return Array.isArray(bar) ? bar[tupleIndex] : value;
    }

    function buildLegendData(data) {
        var seriesData = data.filter(function(d) { return !d.disabled; });
        var barValues = seriesData.length ? seriesData[0].values : [];

        return barValues.map(function(bar, i) {
            return {
                key: barAccessorValue(bar, discretebar.x(), 0),
                value: barAccessorValue(bar, discretebar.y(), 1),
                color: getBarColor(bar, i),
                data: bar,
                selected: !!bar.selected
            };
        });
    }

    function renderExternalLegend(widgetNode, data, containerWidth, sizes) {
        d3.select(widgetNode).select('.nv-legendContainer').remove();
        if (!showLegend) {
            return;
        }

        var legendWrap = d3.select(widgetNode);
        var legendEl = legendWrap.append('div')
            .attr('class', 'nv-legendContainer');
        var legendSvg = legendEl.append('svg').attr('class', 'nvd3');
        legendSvg.append('g').attr('class', 'nv-legendWrap');
        nv.utils.initSVG(legendSvg);

        legend
            .width(containerWidth)
            .align(true)
            .rightAlign(false)
            .updateState(false)
            .color(function(d, i) {
                return d.color || getBarColor(d.data, i);
            });

        legendWrap.select('.nv-legendWrap')
            .datum(buildLegendData(data))
            .call(legend)
            .attr('transform', 'translate(12,0)');

        var legendTop = sizes.chartBlockHeight + layoutGap;
        var legendBoxHeight = Math.max(
            0,
            sizes.parentHeight - legendTop - layoutGap
        );

        legendEl
            .style('top', legendTop + 'px')
            .style('left', '0')
            .style('overflow', 'auto')
            .style('height', legendBoxHeight + 'px')
            .style('width', containerWidth + 'px');

        legendSvg
            .style('height', Math.max(legend.height() + 20, legendBoxHeight) + 'px')
            .style('width', (containerWidth - 10) + 'px');
    }

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(discretebar);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var widgetNode = getWidgetNode(this);
            var containerWidth = widgetNode.clientWidth ||
                nv.utils.sanitizeWidth(width, container);
            var parentHeight = height || widgetNode.clientHeight || 400;

            chart.update = function() {
                dispatch.beforeUpdate();
                container.transition().duration(duration).call(chart);
            };
            chart.container = this;
            tooltip.chartContainer(widgetNode);

            if (!data || !data.length ||
                !data.filter(function(d) { return d.values.length; }).length) {
                nv.utils.noData(chart, container);
                return chart;
            }
            container.selectAll('.nv-noData').remove();

            var barW = discretebar.barWidth() || 28;
            var maxValueCount = d3.max(data, function(s) {
                return (s && s.values) ? s.values.length : 0;
            }) || 0;
            var computedChartWidth =
                maxValueCount * (Math.max(1, data.length) * barW + 35);
            var availableWidth = Math.max(
                0,
                computedChartWidth - margin.left - margin.right
            );
            var chartBlockHeight = chartHeight + margin.top + margin.bottom;
            var needsScroll =
                computedChartWidth + margin.left > containerWidth;

            container
                .style('height', chartBlockHeight + 'px')
                .attr('height', chartBlockHeight);

            setChartScroll(this, needsScroll, chartBlockHeight);
            if (needsScroll) {
                container
                    .style('width', computedChartWidth + 'px')
                    .attr('width', computedChartWidth);
            } else {
                container.style('width', '100%').attr('width', null);
            }

            x = discretebar.xScale();
            y = discretebar.yScale().clamp(true);

            var wrap = container.selectAll('g.nv-wrap.nv-discreteBarWithAxes')
                .data([data]);
            var gEnter = wrap.enter().append('g')
                .attr('class', 'nvd3 nv-wrap nv-discreteBarWithAxes')
                .append('g');
            var defsEnter = gEnter.append('defs');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis')
                .append('g').attr('class', 'nv-zeroLine')
                .append('line');
            gEnter.append('g').attr('class', 'nv-barsWrap');

            renderExternalLegend(widgetNode, data, containerWidth, {
                parentHeight: parentHeight,
                chartBlockHeight: chartBlockHeight
            });

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            // Main Chart Component(s)
            discretebar
                .width(availableWidth)
                .height(chartHeight);

            var barsWrap = g.select('.nv-barsWrap')
                .datum(data.filter(function(d) { return !d.disabled }));

            barsWrap.transition().call(discretebar);


            defsEnter.append('clipPath')
                .attr('id', 'nv-x-label-clip-' + discretebar.id())
                .append('rect');

            g.select('#nv-x-label-clip-' + discretebar.id() + ' rect')
                .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
                .attr('height', 16)
                .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));

            // Setup Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-chartHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + (y.range()[0] + ((discretebar.showValues() && y.domain()[0] < 0) ? 16 : 0)) + ')');
                g.select('.nv-x.nv-axis').call(xAxis);

                var xTicks = g.select('.nv-x.nv-axis').selectAll('g');
                if (staggerLabels) {
                    xTicks
                        .selectAll('text')
                        .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? '5' : '17') + ')' })
                }

                if (rotateLabels) {
                    xTicks
                        .selectAll('.tick text')
                        .attr('transform', 'rotate(' + rotateLabels + ' 0,0)')
                        .style('text-anchor', rotateLabels > 0 ? 'start' : 'end');
                }

                if (wrapLabels) {
                    g.selectAll('.tick text')
                        .call(nv.utils.wrapTicks, chart.xAxis.rangeBand())
                }
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(chartHeight/36, data) )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis').call(yAxis);
            }

            // Zero line
            g.select(".nv-zeroLine line")
                .attr("x1",0)
                .attr("x2",(rightAlignYAxis) ? -availableWidth : availableWidth)
                .attr("y1", y(0))
                .attr("y2", y(0))
            ;
        });

        renderWatch.renderEnd('discreteBar chart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    discretebar.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt['series'] = {
            key: chart.x()(evt.data),
            value: chart.y()(evt.data),
            color: evt.color
        };
        tooltip.data(evt).hidden(false);
    });

    discretebar.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true);
    });

    discretebar.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip();
    });

    discretebar.dispatch.on('elementClick.select', function(evt) {
        dispatch.selectChange(evt);
    });

    // Legend event handlers
    legend.dispatch
        .on('legendClick', function(d, i) {
            d.data.selected = !d.data.selected;
            d.selected = d.data.selected;
            dispatch.selectChange({
                data: d.data,
                index: i,
                color: d.color
            });
        });


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.discretebar = discretebar;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        rotateLabels:  {get: function(){return rotateLabels;}, set: function(_){rotateLabels=_;}},
        wrapLabels:  {get: function(){return wrapLabels;}, set: function(_){wrapLabels=!!_;}},
        showXAxis: {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis: {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},

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
            discretebar.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            discretebar.color(color);
            legend.color(color);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( (_) ? 'right' : 'left');
        }}
    });

    nv.utils.inheritOptions(chart, discretebar);
    nv.utils.initOptions(chart);

    return chart;
}
