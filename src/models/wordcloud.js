// based on http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
nv.models.wordcloud = function() {
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
        ;

    var max,
        fontSize = d3.scale['sqrt']().range([10, 100]);

    var layout = d3.layout.cloud()
        .timeInterval(Infinity)
        .font(font)
        .spiral('archimedean')
        .fontSize(function(d) {
            return fontSize(+d.value);
        })
        .text(function(d) {
            return d.key;
        });


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
            var wrap = container.selectAll('.nv-wrap.nv-wordcloud').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-wordcloud nv-chart-' + id);

            var g = container.selectAll('.nv-wrap.nv-wordcloud');

            function draw(data, bounds) {

                var scale = bounds ? Math.min(
                    availableWidth / Math.abs(bounds[1].x - availableWidth / 2),
                    availableWidth / Math.abs(bounds[0].x - availableWidth / 2),
                    availableHeight / Math.abs(bounds[1].y - availableHeight / 2),
                    availableHeight / Math.abs(bounds[0].y - availableHeight / 2)) / 2 : 1;

                var text = g.selectAll("text")
                    .data(data, function(d) {
                        return d.text.toLowerCase();
                    });

                text
                    .style("font-size", function(d) {
                        return d.size + "px";
                    })
                    .transition()
                    .duration(1000)
                    .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    });

                text.enter().append("text")
                    .attr("text-anchor", "middle")
                    .style("opacity", 1e-6)
                    .style("font-size", function(d) {
                        return d.size + "px";
                    })
                    .transition()
                    .duration(500)
                    .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .style("opacity", 1);

                text.style("font-family", function(d) {
                    return d.font;
                })
                    .style("fill", function(d) {
                        return color(d.text.toLowerCase());
                    })
                    .text(function(d) {
                        return d.text;
                    });

                g.transition().attr("transform", "translate(" + [availableWidth >> 1, availableHeight >> 1] + ")scale(" + scale + ")");
            }

            if (data.length){
                fontSize
                    .domain([+data.slice(-1)[0].value || 1, +data[0].value]);

                layout
                    .stop()
                    .size([availableWidth, availableHeight])
                    .font(font)
                    .words(data)
                    .on('end', draw)
                    .start();
            }

            chart.update = function() {

                if ( duration === 0 ) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };

            chart.container = this;

            g.attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

        });

        layout.on('end', chart.draw);

        renderWatch.renderEnd('wordcloud immediate');
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
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
