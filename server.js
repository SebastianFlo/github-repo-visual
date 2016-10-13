var express = require('express');
var fs = require('fs');
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
    var repo = req.query.repo;
    if (!repo) {
        res.json({
            error: 'No repo'
        });
        return;
    }

    fs.stat(repo + '.json', function (err) {
        if (err) {
            console.log('no cached data');
            getEffortData(repo);
        } else {
            fs.readFile(repo + '.json', 'utf8', function (err, data) {
                if (err){
                    res.json({
                        error: 'No repo'
                    });
                }
                res.json(data);
            });
        }
    });




    function getEffortData(repo) {

        var process = exec('(cd /Users/sebastianflorian-falcon/Documents/audience/' + repo + '&& git effort --above 1)');

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
            var fs = require('fs');

            var effordDataByLine = effortData.split(/\r?\n/);
            var returnObj = {};
            var maxCommits = 0;
            var count = 0;

            // return JSON.stringify(effordDataByLine, null, '    ');
            var mappedEffortData = effordDataByLine.filter(function (line) {
                console.log((/\w+(|\.+) \d+/).test(line));
                return (/\w+(|\.+) \d+/).test(line);
            }).filter(function (line) {
                return line.length > 0 || line !== '' || line !== '  ';
            }).map(function (line) {
                return line.replace(/\,\ +/, '');
            }).map(function (line) {

                var lineElements = line
                    .split(' ')
                    .filter(function (x) { return x.length > 0 });

                var filename = formatFileName(lineElements[0]);
                returnObj[filename] = parseInt(lineElements[1]);
                maxCommits = maxCommits < parseInt(lineElements[1]) ? parseInt(lineElements[1]) : maxCommits;
                count++;
            })

            returnObj.maxCommits = maxCommits;
            returnObj.count = count;

            saveToFile(repo, returnObj);

            res.json(returnObj);
        }
    }

});

function saveToFile(title, obj) {
    var json = JSON.stringify(obj);
    fs.writeFile(title + '.json', json, 'utf8');
}

function formatFileName(fileName) {
    return fileName.replace(/\.{2,}/, '');
}