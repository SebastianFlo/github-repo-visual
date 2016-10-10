var w = 1280,
    h = 800,
    r = 720,
    x = d3.scale.linear().range([0, r]),
    y = d3.scale.linear().range([0, r]),
    node,
    root;

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

var pack = d3.layout.pack()
    .size([r, r])
    .value(function (d) { return d.size; })

var vis = d3.select('body').insert('svg:svg', 'h2')
    .attr('width', w)
    .attr('height', h)
    .append('svg:g')
    .attr('transform', 'translate(' + (w - r) / 2 + ',' + (h - r) / 2 + ')');

function init(url) {

    d3.json(url, function (error, json) {
        if (error) {
            return console.warn(error);
        }

        data = formatFileData(json);

        // root = treeData;

        /*
            children  : [
                children: [
                    {
                    name: 'AgglomerativeCluster'
                    size: 3938
                    }
                ]
            ]
        */

        update(data);

        exclude = null;
        d3.select(window).on('click', function () { zoom(root); });
    });
}

function setFileData(json) {
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
}

function setFileCommits(json) {
    // add each file commits here
    getEffort().done(function(data) {
        commits = data;
        maxCommits = data.maxCommits;

        json.tree.forEach(function (o) {
            if (commits[o.filename]) {
                o.commits = commits[o.filename];
            }
        });
    });

}

function formatFileData(json) {
    setFileData(json);
    setFileCommits(json);

    var dataMap = json.tree.reduce(function (map, node) {
        map[node.path] = node;
        return map;
    }, {});

    json.tree.forEach(function (node) {
        // add to parent
        var parent = dataMap[node.parent];
        if (parent) {
            (parent.children || (parent.children = [])).push(node);
        } else {
            // parent is null or missing
            treeData.push(node);
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

    var formattedTreeData = formatTreeData(treeData);

    return formattedTreeData;
}

function formatTreeData(data) {
    var formattedData = {};
    formattedData.children = data;
    return formattedData;
}

function update(root) {
    var nodes = pack.nodes(root);

    vis.selectAll('circle')
        .data(nodes)
        .enter().append('svg:circle')
        .attr('class', function (d) { return d.children ? 'parent' : 'child'; })
        .attr('cx', function (d) { 
            return d.x; 
        })
        .attr('cy', function (d) { 
            return d.y; 
        })
        .attr('r', function (d) { 
            return d.r; 
        })
        .on('click', function (d) { return zoom(root == d ? root : d); });

    vis.selectAll('text')
        .data(nodes)
        .enter().append('svg:text')
        .attr('class', function (d) { return d.children ? 'parent' : 'child'; })
        .attr('x', function (d) { return d.x; })
        .attr('y', function (d) { return d.y; })
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .style('opacity', function (d) { return d.r > 20 ? 1 : 0; })
        .text(function (d) { 
            return d.filename; 
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
    if (!d) {
        return;
    }
    var k = r / d.r / 2;
    x.domain([d.x - d.r, d.x + d.r]);
    y.domain([d.y - d.r, d.y + d.r]);

    var t = vis.transition()
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

