'use strict';

var viz = d3.select('#viz');
var margin = 50,
    width,
    height,
    svg,
    canvas;
var nodes = [],
    links = [],
    foci = new Set(),
    currNames = new Set();
var link,
    node;
var writers,
    focus;
var sidebar = d3.select('#sidebar'),
    examples = sidebar.select('#examples');

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.writer_name))
    .force("charge", d3.forceManyBody().strength(-3000))
    .force('collide', d3.forceCollide(80));

d3.json("data/writers.json", dataLoaded);


function dataLoaded (error, data) {
    if (error) {
        throw error;
    }
    writers = data;
    displayWriterNames(writers);
}

function displayWriterNames(writers) {
    var names = Object.keys(writers).sort(lastNameCompare);
    viz.html('');
    viz.append('h2')
        .text('Choose a writer to learn about!');
    viz.append('div')
        .selectAll('p')
        .data(names)
        .enter()
        .append('p')
        .text(d => d)
        .on('click', startViz);
}

function startViz(name) {
    viz.html(' ');
    svg = viz.append('svg');
    // http://www.d3noob.org/2013/03/d3js-force-directed-graph-example-basic.html
    // build the arrow.
    svg.append("svg:defs").selectAll("marker")
        .data(["end"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 50)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");
    var dims = svg.node().getBoundingClientRect();
    width = dims.width - 2 * margin;
    height = dims.height - 2 * margin;
    canvas = svg.append('g')
        .attr('transform', 'translate(' + margin + ',' + margin + ')');
    link = canvas.append('g')
        .attr('class', 'links')
        .selectAll('line');
    node = canvas.append('g')
        .attr('class', 'nodes')
        .selectAll('g');

    growGraph(name);
    if (nodes.length > 1) {
        sidebarOther(nodes[1]);
    }
}

function ticked() {
    var k = 200 * simulation.alpha();
    link.each(function(d) {
        if (!foci.has(d.source.writer_name)){
            // console.log('moving', d.source.writer_name, 'up');
            d.source.y -=k;
        }
        if (!foci.has(d.target.writer_name)){
            // console.log('moving', d.source.writer_name, 'down');
            d.target.y +=k;
        }
    });
    node.each(function(d) {
        if (d.y < 0 ) {
            d.y = 0;
        }
        if (d.x < 0) {
            d.x = 0;
        }
        if (d.y > height) {
            d.y = height;
        }
        if (d.x > width) {
            d.x = width - margin;
        }
    });
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}

function switchFocus(name) {
    focus = writers[name];
    sidebarFocus();
    colorLinks();
    node.classed('focus', d => foci.has(d.writer_name));
    node.classed('current-focus', d => focus === d);
}

function colorLinks() {
    link.attr('class', function (d) {
        console.log(d);
        if (d.source === focus) {
            return 'focus-influencee';
        }
        if (d.target === focus) {
            return 'focus-influencer';
        }
        return '';
    });
}

function addFocus(name) {
    foci.add(name);
    focus = writers[name];
    if (!currNames.has(name)) {
        currNames.add(name);
        nodes.push(focus);
    }
    for (var influencerName in focus.influencers) {
        if (foci.has(influencerName)) {
            continue;
        }
        links.push({
            source: influencerName,
            target: name,
            context: focus.influencers[influencerName]
        });
        if (!currNames.has(influencerName)) {
            var influencer = writers[influencerName];
            nodes.push(influencer);
            currNames.add(influencerName);
        }
    }
    for (var influenceeName in focus.influencees) {
        if (foci.has(influenceeName)) {
            continue;
        }
        links.push({
            source: name,
            target: influenceeName,
            context: focus.influencees[influenceeName]
        });
        if (!currNames.has(influenceeName)) {
            var influencee = writers[influenceeName];
            nodes.push(influencee);
            currNames.add(influenceeName);
        }
    }
}

function growGraph(name) {
    width += 500;
    height += 500;
    svg.style('width', width + 2 * margin);
    svg.style('height', height + 2 * margin);

    addFocus(name);
    link = link.data(links, linkKey)
        .enter().append('line').attr('marker-end', 'url(#end)')
        .merge(link);

    var newNodes = node.data(nodes, nodeKey)
        .enter().append('g');
    newNodes.append('text')
        .text(d => d.writer_name)
        .on('click', sidebarOther);
    node = newNodes.merge(node);

    restartSimulation();
    switchFocus(name);
}

function sidebarFocus() {
    sidebar.select('#focus').text(focus.writer_name);
    sidebar.select('#focus-image').attr('src', focus.photo_url);
}
function sidebarOther(writer) {
    examples.html(' ');
    sidebar.select('#other-writer').text(writer.writer_name);
    if (writer.writer_name in focus.influencers &&
        writer.writer_name in focus.influencees) {
        sidebar.select('#influence-sentence')
            .text('influenced and was influenced by');
        examples.append('h4')
            .text('From ' + focus.writer_name + "'s interview:");
        examples.selectAll('p .influencer-example')
            .data(focus.influencers[writer.writer_name])
            .enter().append('p').text(d => '… ' + d + ' …');
        examples.append('h4')
            .text('From ' + writer.writer_name + "'s interview:");
        examples.selectAll('p .influencee-example')
            .data(focus.influencees[writer.writer_name])
            .enter().append('p').text(d => '… ' + d + ' …');
    }
    else if (writer.writer_name in focus.influencers) {
        sidebar.select('#influence-sentence')
            .text('was influenced by');
        examples.append('h4')
            .text('From ' + focus.writer_name + "'s interview:");
        examples.selectAll('p .influencer-example')
            .data(focus.influencers[writer.writer_name])
            .enter().append('p').text(d => '… ' + d + ' …');
    }
    else if (writer.writer_name in focus.influencees) {
        sidebar.select('#influence-sentence')
            .text('influenced');
            examples.append('h4')
                .text('From ' + writer.writer_name + "'s interview:");
        examples.selectAll('p .influencee-example')
            .data(focus.influencees[writer.writer_name])
            .enter().append('p').text(d => '… ' + d + ' …');
    }
    else {
        sidebar.select('#influence-sentence')
            .text('has unknown relationship to');
    }
    sidebar.select('#other-image').attr('src', writer.photo_url);
    sidebar.select('#focus-other')
        .text('[Focus on ' + writer.writer_name + "'s connections.]")
        .on('click', function() {
            var prevFocus = focus;
            if (foci.has(writer.writer_name)) {
                switchFocus(writer.writer_name);
            }
            else {
                growGraph(writer.writer_name);
            }
            sidebarOther(prevFocus); // Switcharoo!!!!!
        });
    sidebar.select('#remove-link')
        .text('[Remove the connection between ' + focus.writer_name + ' and ' +
                writer.writer_name + '.]')
        .on('click', function() {
            removeLink(focus.writer_name, writer.writer_name);
        });
}

function lastNameCompare(a, b) {
    var aSplit = a.split(' ');
    a = aSplit[aSplit.length - 1] + a;
    var bSplit = b.split(' ');
    b = bSplit[bSplit.length - 1] + a;
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

function restartSimulation() {
    simulation.nodes(nodes).on('tick', ticked);
    simulation.force("center", d3.forceCenter(width / 2, height / 2))
        .force('link').links(links);
    simulation.alpha(1).restart();
}

function removeLink(name1, name2) {
    links = links.filter(function (l) {
        return !((l.source.writer_name === name1 && l.target.writer_name === name2) ||
            (l.source.writer_name === name2 && l.target.writer_name === name1));
    });
    if (!linksContains(name1)) {
        removeNode(name1);
    }
    if (!linksContains(name2)) {
        removeNode(name2);
    }
    node = node.data(nodes, nodeKey);
    node.exit().remove();
    link = link.data(links, linkKey);
    link.exit().remove();
}

function removeNode(name) {
    console.log(name);
    nodes = nodes.filter(n => n.writer_name !== name);
    currNames.delete(name);
    if (foci.delete(name)) {
        switchFocus(foci.values().next().value);
    }
    else { // Deleted a non-focus, so need to switch the "other" part of sidebar
        sidebarOther(nodes[0]);
    }
}

function linksContains (name) {
    return links.filter(l => l.source.writer_name === name || l.target.writer_name === name).length > 0;
}

function nodeKey(d) {
    return d.writer_name;
}

function linkKey(d) {
    return d.source.writer_name + '-' + d.target.writer_name;
}
