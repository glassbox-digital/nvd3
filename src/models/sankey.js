// based on http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
nv.models.sankey = function () {
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
        , format = function (d) {
            return d3.format(",.0f")(d);
        }
        , labels = false
        ;

    var sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(10);


    var path = sankey.link();

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();

        selection.each(function (data) {
            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin);
            var availableHeight = nv.utils.availableHeight(height, container, margin);

            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-sankey').data([data], function () {
                return data;
            });
            wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sankey nv-chart-' + id);

            var g = container.select('.nv-wrap.nv-sankey');

            if (data.nodes && data.nodes.length) {
                sankey
                    .size([availableWidth, availableHeight])
                    .nodes(data.nodes)
                    .links(data.links)
                    .layout(32);

                var linkWrap = g.selectAll('g.linkWrap')
                    .data([data.links])
                    .enter()
                    .append('g')
                    .attr('class', 'linkWrap');

                linkWrap = g.selectAll('g.linkWrap');

                var link = linkWrap.selectAll(".link")
                    .data(data.links);

                var linkEnter = link.enter().append("path")
                    .attr("class", "link");

                linkEnter.append("title")
                    .text(function (d) {
                        return "from " + d.source.name + " to " + d.target.name + ": " + format(d.value);
                    });

                link
                    .style('opacity', 0.1)
                    .attr("d", path)
                    .sort(function (a, b) {
                        return b.dy - a.dy; // so that the lighter link will be hover-able
                    });

                link.exit().remove();


                var nodeWrap = g.selectAll('g.nodeWrap')
                    .data([data.nodes])
                    .enter()
                    .append('g')
                    .attr('class', 'nodeWrap');

                nodeWrap = g.selectAll('g.nodeWrap');

                var node = nodeWrap.selectAll(".node")
                    .data(data.nodes);

                var nodeEnter = node
                    .enter().append("g")
                    .attr("class", "node")
/*
                    .call(d3.behavior.drag()
                        .origin(function (d) {
                            return d;
                        })
                        .on("dragstart", function () {
                            this.parentNode.appendChild(this);
                        })
                        .on("drag", dragmove))
*/
                    .on('mouseover', function (d, i) {
                        d3.select(this)
                            .classed('hover', true)
                            .style('opacity', 0.8);
                        dispatch.elementMouseover({
                            data: d,
                            i: i/*,
                             color: d3.select(this).style("fill")*/
                        });
                    })
                    .on('mouseout', function (d, i) {
                        d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.elementMouseout({
                            data: d,
                            i: i
                        });
                    })
                    .on('dblclick', function (d, i) {
                        //d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.elementDblClick({
                            data: d,
                            i: i
                        });
                    })
                    .on('click', function (d, i) {
                        //d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.elementClick({
                            data: d,
                            i: i
                        });
                    });

                nodeEnter.append("rect")
                    .attr("width", sankey.nodeWidth())
                    .style("fill", function (d) {
                        return d.color = color(d.ratio); /*color(d.name.replace(/ .*!/, ""));*/
                    })
/*
                    .style("stroke", function (d) {
                        return d3.rgb(d.color).darker(2);
                    })
*/
                    .append("title")
                    .text(function (d) {
                        return d.name + "\n" + format(d.value) + ", " + format(d.ratio) + "%";
                    });

                if (labels) {
                    nodeEnter.append("text")
                        .attr("x", -6)
                        .attr("y", function (d) {
                            return d.dy / 2;
                        })
                        .attr("dy", ".35em")
                        .attr("text-anchor", "end")
                        .attr("transform", null)
                        .text(function (d) {
                            return d.name;
                        })
                        .filter(function (d) {
                            return d.x < width / 2;
                        })
                        .attr("x", 6 + sankey.nodeWidth())
                        .attr("text-anchor", "start");
                }


                node
/*
                    .attr("transform", function (d) {
                        return "translate(" + d.x + ",0)";
                    })
*/
                    .transition().duration(duration)
                    .attr("transform", function (d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    })
                    .attr("height", function (d) {
                        return d.dy;
                    })
                    .selectAll('rect').attr('height', function (d) {
                        return d.dy;
                    }).each('end', function () {
                        link.transition().duration(duration)
                            .style('opacity', 1)
                            .style("stroke-width", function (d) {
                                return Math.max(1, d.dy);
                            });

                    });

                node.each(function(d){
                    d3.select(this).classed('selected', d.selected);
                });

                node.exit().remove();


            }

            function dragmove(d) {


                var delta = d3.event.y - d.y;

                d.y = Math.max(0, Math.min(height - d.dy, d3.event.y));
                console.log(delta < 0 ? 'UP' : 'DOWN', d.y);


                d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");

                // this logic should be contained within d3.sankey
                /*
                 function _symetric(d){ return d.y + d.dy/2; }
                 g.selectAll('.node').filter(function(n){ return n.x === d.x; }).sort( function( a, b){ return _symetric(a) - _symetric(b)});
                 */

                sankey.relayout();
                g.selectAll('.link').attr("d", path);

                g.selectAll(".node")
                    .attr("transform", function (d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    })

            }

            chart.update = function () {

                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };

            chart.container = this;

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

        });

        renderWatch.renderEnd('sankey immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: {
            get: function () {
                return width;
            }, set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            }, set: function (_) {
                height = _;
            }
        },
        font: {
            get: function () {
                return font;
            }, set: function (_) {
                font = _;
            }
        },
        id: {
            get: function () {
                return id;
            }, set: function (_) {
                id = _;
            }
        },
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
            }
        },
        groupColorByParent: {
            get: function () {
                return groupColorByParent;
            }, set: function (_) {
                groupColorByParent = !!_;
            }
        },

        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = _.top != undefined ? _.top : margin.top;
                margin.right = _.right != undefined ? _.right : margin.right;
                margin.bottom = _.bottom != undefined ? _.bottom : margin.bottom;
                margin.left = _.left != undefined ? _.left : margin.left;
            }
        },
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        },
        format: {
            get: function () {
                return format;
            }, set: function (_) {
                format = d3.functor(_);
            }
        },
        labels: {
            get: function () {
                return labels;
            }, set: function (_) {
                labels = _;
            }
        }
    });

    nv.utils.initOptions(chart);

    return chart;
};
