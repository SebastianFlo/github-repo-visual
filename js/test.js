var diameter = 960,
    format = d3.format(',d');

var treeData = [];
var exclude;


function getRepo() {
    var access_token = '986e95bb9bfee878e7dde9a07ae5c1e720e590fa';
    var owner = 'FalconSocial';
    var repo = 'audience-frontend';
    var branch;


    $.ajax({
        url: 'https://api.github.com/repos/' + owner + '/' + repo + (branch ? '/branches/' + branch : '/commits'),
        data: {
            access_token: access_token
        },
        success: function (data) {
            var sha = branch ? data.commit.sha : data[0].sha,
                url = 'https://api.github.com/repos/' + owner + '/' + repo + '/git/trees/' + sha + '?recursive=1&access_token=' + access_token;
            init(url);
        },
        error: function (request, status, error) {
            $('img#logo').attr('src', 'images/logo.png');
            alert('Error loading repo: ' + request.statusText);
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
            console.dir(node);
        });

        root = treeData[0];
        update();
        exclude = null;

    });

    d3.select(self.frameElement).style('height', diameter + 'px');
}

function formatName(filename) {
    if (filename.indexOf('Audience') > -1) {
        return filename.slice('Audience'.length);
    }
    return filename;
}

function update() {
    var pack = d3.layout.pack()
        .size([diameter - 4, diameter - 4])
        .value(function (d) { return d.size; });

    var svg = d3.select('body').append('svg')
        .attr('width', diameter)
        .attr('height', diameter)
        .append('g')
        .attr('transform', 'translate(2,2)');

    var node = svg.datum(root).selectAll('.node')
        .data(pack.nodes)
        .enter().append('g')
        .attr('class', function (d) { return d.children ? 'node' : 'leaf node'; })
        .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });

    node.append('title')
        .text(function (d) { return formatName(d.filename) + (d.children ? '' : ': ' + format(d.size)); });

    node.append('circle')
        .attr('r', function (d) { return d.r; });

    node.filter(function (d) { return !d.children; }).append('text')
        .attr('dy', '.3em')
        .style('text-anchor', 'middle')
        .text(function (d) { return formatName(d.filename).substring(0, d.r / 3); });
}

getRepo();