// based on http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
nv.models.treemap = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = null
        , height = null
        , mode = "count"
        , modes = {count: function(d) { return 1; }, size: function(d) { return d.size }}
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , color = nv.utils.defaultColor()
        , groupColorByParent = false
        , duration = 500
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMousemove', 'elementMouseover', 'elementMouseout', 'renderEnd')
        ;

    var partition = d3.layout.treemap()
        .sort(null);

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
            var wrap = container.selectAll('.nv-wrap.nv-treemap').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-treemap nv-chart-' + id);

            chart.update = function() {
                if ( duration === 0 ) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;


            //wrap.attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });



            partition.value(function(d){ return d.value; })
                .size([availableWidth, availableHeight])
                .nodes({children: data});

            var nodes = wrap.selectAll('.node')
                .data(data);

            var nodesEnter = nodes.enter()
                .append("g")
                .attr("class", "node")
                .on('mouseover', function(d,i){
                    d3.select(this).classed('hover', true).style('opacity', 0.8);
                    dispatch.elementMouseover({
                        data: d,
                        color: d3.select(this).select('rect').style("fill")
                    });
                })
                .on('mouseout', function(d,i){
                    d3.select(this).classed('hover', false).style('opacity', 1);
                    dispatch.elementMouseout({
                        data: d
                    });
                })
                .on('mousemove', function(d,i){
                    dispatch.elementMousemove({
                        data: d
                    });
                })
                .on('click', function(d, i) {
                    var element = this;

                    d.selected = !d.selected;
                    d3.select(this).classed('selected', d.selected);

                    dispatch.elementClick({
                        data: d,
                        index: i,
                        color: d3.select(this).select('rect').style("fill"),
                        event: d3.event,
                        element: element
                    });
                });

            nodesEnter
                .append("rect");

            nodesEnter
                .append("text").text(function(d){ return d.name;})
                .attr("dy", "1em");

            nodesEnter.append('path').attr('class', 'nv-check')
                .attr('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z');



            nodes.attr("transform", function(d){ return "translate(" + d.x + ", " + d.y  + ")"; });

            nodes.selectAll('rect')
                .transition()
                .duration(duration)
                .attr("width", function(d){ return d.dx; })
                .attr("height", function(d){ return d.dy; })
                .style("fill", function (d) {
                    if (d.color) {
                        return d.color;
                    }
                    else if (groupColorByParent) {
                        return color((d.children ? d : d.parent));
                    }
                    else {
                        return color(d);
                    }
                })
                .style("stroke", "#FFF");

            nodes.select('path.nv-check')
                .attr('transform', function (d, i) {
                    var center = [d.dx /2 - 10, d.dy /2 -10];
                    return 'translate(' + center[0] + ', ' + center[1] + ')';
                });

            nodes.classed('selected', function(d){ return d.value > 0 && d.selected; });

            nodes.exit().remove();
        });

        renderWatch.renderEnd('treemap immediate');
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
        mode:       {get: function(){return mode;}, set: function(_){mode=_;}},
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
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
