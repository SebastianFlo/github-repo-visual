var diameter = 960,
    format = d3.format(',d')
x = d3.scale.linear().range([0, diameter]),
    y = d3.scale.linear().range([0, diameter]);

var treeData = [];
var exclude;
var owner = 'FalconSocial';
var repo = 'audience-frontend';
var branch;
var commits = [];
var maxCommits = 0;

var access_token;

$.getJSON('data/secret/token.json', function (data) {
    getRepo(data.token);
});

function getRepo(access_token) {
    $.ajax({
        url: 'https://api.github.com/repos/' + owner + '/' + repo + (branch ? '/branches/' + branch : '/commits'),
        data: {
            access_token: access_token
        },
        success: function (data) {
            var sha, url;
            sha = branch ? data.commit.sha : data[0].sha;
            url = 'https://api.github.com/repos/' + owner + '/' + repo + '/git/trees/' + sha + '?recursive=1&access_token=' + access_token;
            init(url);
        }
    });
}

function init(url) {

    d3.json(url, function (error, json) {
        if (error) {
            return console.warn(error);
        }


        json.tree.forEach(function (o) {
            var indexSlash = o.path.lastIndexOf('/');
            if (indexSlash < 0) {
                o.parent = 'root';
                o.filename = o.path;
                o.name = o.path;
            } else {
                o.parent = o.path.substr(0, indexSlash);
                o.filename = o.path.substr(indexSlash + 1);
                o.name = o.path;
            }
        });

        // add each file commits here
        getEffort().done(function (data) {
            commits = data;
            maxCommits = data.maxCommits;
        });

        json.tree.forEach(function (o) {
            if (commits[o.filename]) {
                o.commits = commits[o.filename];
            }
        });

        json.tree.unshift({
            'path': 'root',
            'type': 'tree',
            'size': 0,
            'parent': null,
            'filename': 'root',
            'name': 'root'
        });

        var dataMap = json.tree.reduce(function (map, node) {
            map[node.path] = node;
            return map;
        }, {});

        json.tree.forEach(function (node) {
            // add to parent
            var parent = dataMap[node.parent];
            if (parent) {
                if (exclude && exclude.indexOf(parent.path) > -1) {
                    (parent._children || (parent._children = [])).push(node);
                }
                // create child array if it doesn't exist
                else
            (parent.children || (parent.children = [])).push(node);
            } else {
                // parent is null or missing
                treeData.push(node);
            }
        });

        root = treeData[0];
        update();
        exclude = null;

    });

    d3.select(window).on('click', function () { zoom(treeData); });
    d3.select(self.frameElement).style('height', diameter + 'px');
}

function formatName(filename) {
    // if (filename.indexOf('Audience') > -1) {
    if (/^Audience/.test(filename)) {
        return filename.slice('Audience'.length);
    }

    if (/^audience-/.test(filename)) {
        return filename.slice('audience-'.length);
    }
    return filename;
}

var pack = d3.layout.pack()
    .size([diameter - 4, diameter - 4])
    .value(function (d) { return d.size; });

var svg = d3.select('body').append('svg')
    .attr('width', diameter)
    .attr('height', diameter)
    .append('g')
    .attr('transform', 'translate(2,2)');

function update() {
    var node = svg.datum(root).selectAll('.node')
        .data(pack.nodes)
        .enter().append('g')
        .attr('class', function (d) { return d.children ? 'node' : 'leaf node'; })
        .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });

    node.append('title')
        .text(function (d) {
            var toolTip = formatName(d.filename);
            if (d.commits) {
                toolTip = toolTip + ' [' + d.commits + ']';
            }
            return toolTip;
        });

    node.append('circle')
        .attr('r', function (d) { return d.r; })
        .on('click', function (d) { return zoom(node == d ? root : d); });


    node.filter(function (d) { return !d.children; }).append('text')
        .attr('dy', '.3em')
        .style('text-anchor', 'middle')
        .text(function (d) { return formatName(d.filename).substring(0, d.r / 3); });

    node.filter(function (d) { return !d.children; })
        .style('opacity', function (d) {
            if (!d.commits) {
                return 0.5;
            }

            if (d.commits > 50) {
                d.commits = 50
            }

            return (50 + 50 * (1 * d.commits) / 50) / 100;
        });
}

// get effort 
function getEffort() {
    return $.ajax({
        url: '/effort',
        async: false,
        success: function (data) {
            return data;
        }
    });
}


function zoom(d, i) {
    var k = diameter / d.r / 2;
    x.domain([d.x - d.r, d.x + d.r]);
    y.domain([d.y - d.r, d.y + d.r]);

    var t = svg.transition()
        .duration(d3.event.altKey ? 7500 : 750);

    t.selectAll('circle')
        .attr('cx', function (d) { return x(d.x); })
        .attr('cy', function (d) { return y(d.y); })
        .attr('r', function (d) { return k * d.r; });

    t.selectAll('text')
        .attr('x', function (d) { return x(d.x); })
        .attr('y', function (d) { return y(d.y); })
        .style('opacity', function (d) { return k * d.r > 20 ? 1 : 0; });

    node = d;
    d3.event.stopPropagation();
}