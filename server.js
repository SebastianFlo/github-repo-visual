var express = require('express');
var app = express();
var path = require('path');
var exec = require('child_process').exec;
var effort = [];

app.use(express.static('public'));



var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Github viz app listening at http://%s:%s', host, port);
});


app.get('/effort', function (req, res) {
    // exec('(cd /Users/sebastianflorian-falcon/Documents/audience/audience-frontend && git effort)', puts);

    var process = exec('(cd /Users/sebastianflorian-falcon/Documents/audience/audience-frontend && git effort)');

    process.stdout.on('data', function (data) {
        effort.push(data);
    });

    process.stdout.on('end',
        function () {
            puts(effort);
        }
    );

    function puts(data) {
        var effortData = data.toString();
        var effordDataByLine = effortData.split(/\r?\n/);
        var returnObj = {};
        var maxCommits = 0;

        // return JSON.stringify(effordDataByLine, null, '    ');
        var mappedEffortData = effordDataByLine.filter(function (line) {
            console.log((/\w+(|\.+) \d+/).test(line));
            return (/\w+(|\.+) \d+/).test(line);
        }).filter(function (line) {
            return line.length > 0 || line !== '' || line !== '  ';
        }).map(function(line){
            return line.replace(/\,\ +/, '');
        }).map(function (line) {

            var lineElements = line
                .split(' ')
                .filter(function (x) { return x.length > 0 });

            var filename = formatFileName(lineElements[0]);
            returnObj[filename] = parseInt(lineElements[1]);
            maxCommits = maxCommits < parseInt(lineElements[1]) ? parseInt(lineElements[1]) : maxCommits;
        })

        returnObj.maxCommits = maxCommits;
        res.json(returnObj);
    }
});

function formatFileName(fileName) {
    return fileName.replace(/\.{2,}/, '');
}