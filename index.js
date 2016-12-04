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
    var dims = svg.node().getBoundingClientRect();
    width = dims.width - 2 * margin;
    height = dims.height - 2 * margin;
    canvas = svg.append('g')
        .attr('transform', 'translate(' + margin + ',' + margin + ')');

    addFocus(name);
    if (nodes.length > 1) {
        sidebarOther(nodes[1]);
    }
    link = canvas.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line');
    node = canvas.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g');
    node.append('text')
        .text(d => d.writer_name)
        .on('click', sidebarOther);

    simulation.nodes(nodes).on('tick', ticked);
    simulation.force("center", d3.forceCenter(width / 2, height / 2))
        .force('link').links(links);
}

function ticked() {
    console.log('hi');
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

function addFocus(name) {
    foci.add(name);
    focus = writers[name];
    sidebarFocus();
    if (!currNames.has(name)) {
        console.log(name);
        currNames.add(name);
        nodes.push(focus);
    }
    for (var influencerName in focus.influencers) {
        links.push({
            source: influencerName,
            target: name,
            context: focus.influencers[influencerName]
        });
        if (currNames.has(influencerName)) {
            continue;
        }
        var influencer = writers[influencerName];
        nodes.push(influencer);
        currNames.add(influencerName);
    }
    for (var influenceeName in focus.influencees) {
        links.push({
            source: name,
            target: influenceeName,
            context: focus.influencees[influenceeName]
        });
        if (currNames.has(influenceeName)) {
            continue;
        }
        var influencee = writers[influenceeName];
        nodes.push(influencee);
        currNames.add(influenceeName);
    }
}

function growGraph(writer) {
    width += 500;
    height += 500;
    svg.style('width', width + 2 * margin);
    svg.style('height', height + 2 * margin);

    addFocus(writer.writer_name);
    link = link.data(links)
        .enter().append('line')
        .merge(link);

    var newNodes = node.data(nodes)
        .enter().append('g');
    newNodes.append('text')
        .text(d => d.writer_name)
        .on('click', sidebarOther);
    node = newNodes.merge(node);

    simulation.nodes(nodes);
    simulation.force('link').links(links);
    simulation.alpha(1).restart();
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
    sidebar.select('#focus-other')
        .text('Focus on ' + writer.writer_name + "'s connections.")
        .on('click', function() {
            var prevFocus = focus;
            growGraph(writer);
            sidebarOther(prevFocus); // Switcharoo!!!!!
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
