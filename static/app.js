
var bindFeatureDataList = function(features, required, onItem, sumCurrent) {
    var onItem = onItem || function() {};
    var supportedByCurrent = BrowserStats.browsers.browsersByFeature(required, ["y", "y x", "a", "a x"]);
    //var sumCurrent = _.reduce(supportedByCurrent, function(memo, num){ return memo + num.share; }, 0);
    $("#featureList").html("");
    $("#free").html("");
    for(var i in features) {
    var supportedBy = BrowserStats.browsers.browsersByFeature(required.concat(i), ["y", "y x", "a", "a x"]);
var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
    var difference = (sum / sumCurrent) * 100;
    var actual = sumCurrent - sum;

    $("#featureList").append("<option value='" + i  + "'>" +  difference.toFixed(2)  + "%</option>");
    onItem({"id": i, "title": BrowserStats.browsers.getFeature(i).title, "difference": difference, "actual": sum});
    }
};

var buildAdditionalFeatures = function(item) {
    var hue = Math.round(item.difference);
    var elem = $("li[data-feature='" + item.id  + "']");
    var span = elem.find('.featpct');
    elem.find('label').css({ "border-color": "hsla(" + hue + ", 100%, 42%, 1)"})
    span.css({
    'background-color': "hsla(" + hue + ", 100%, 42%, 1)",
    'width': (item.difference.toFixed(0) + "%")
    });
    span.text(item.difference.toFixed(0) + "%");
}

$(function() {
    var deviceType = "all";
    deviceType = window.location.host.indexOf("onmobile") == 0 ? "mobile": deviceType;
    deviceType = window.location.host.indexOf("ondesktop") == 0 ? "desktop": deviceType;
        $("#charts").addClass(deviceType);
        $("#usertype").text(deviceType);

    BrowserStats.load(deviceType, function(browsers) {
    var features = browsers.features;
    _.each(features, function(itm, idx) { itm.id = idx });
    var feats = _.sortBy(_.keys(features), function(itm) { return itm; });
    
    $("#features")[0].innerHTML = feats.map(function(feat){
        var feat = features[feat];
        return "<li data-feature='" + feat.id + "'><label for='" + feat.id + "chk'>" + feat.title + "</label><span class=pctholder><span class=featpct></span></span>";
    }).join("");
    
    
    var updateShare = function(requiredFeatures) {
        if(!!requiredFeatures === false)  return;
        var total = BrowserStats.browsers.browsersByFeature([], ["y", "y x", "a", "a x"]);
        var supportedBy = BrowserStats.browsers.browsersByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);

        var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
        var totalSum = _.reduce(total, function(memo, num){ return memo + num.share; }, 0);
        $("#share").css({"color": "hsla(" + Math.round((90 / 100) * (sum /totalSum * 100)) + ", 100%, 42%, 1)"  }).text((sum / totalSum * 100).toFixed(2));

        bindFeatureDataList(features, requiredFeatures, buildAdditionalFeatures, sum)
        // Version numbers aren't that interesting here.
    //   drawTable("#totalShare",["name", "since", "share"], supportedBy);
    //   drawPie("#totalShareChart",["name", "since", "share"], supportedBy);
        
    //   var mobileDesktopSplitData = BrowserStats.browsers.typesByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);
    //   drawTable("#mobileDesktopSplit",["name", "share"], mobileDesktopSplitData); 
    //   drawPie("#mobileDesktopSplitChart",["name", "share"], mobileDesktopSplitData); 
    };

    var updateHeader = function(requiredFeatures) {
        if(!!requiredFeatures === false || requiredFeatures.length === 0) {
        $("#usedFeatures ul").html("nothing special");
        }
        else {
        $("#usedFeatures ul").html(_.map(requiredFeatures, function(i) {
            var item = BrowserStats.browsers.getFeature(i);
            return "<li><input data-feature='" + item.id +  "' type='checkbox' id='" + item.id + "usedchk'/><label for='" + item.id + "usedchk'>" + item.title + "</label>"
        }).join(""));
        }
    };

    $("input[type=checkbox]").live('change', function() {
        var featureName = $(this).data("feature");
        var checked = $(this).prop("checked");
        
        // toggle all the other checkboxes for the same feature 
        $("input[data-feature='" + featureName + "']").prop("checked", (checked)? "checked" : false);
        
        var featureList = _.uniq($("input:checked").map(function(val, i) { return $(i).data("feature"); }).toArray());
        window.location.hash = featureList.join(",");
    });
    
    // window.addEventListener("hashchange", function() {
    //   var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
    // //   updateShare(urlFeats);
    // //   updateHeader(urlFeats);
    //   $(_.toArray(_.map(urlFeats, function(f) { return "input[data-feature='" + f + "']" })).join()).prop("checked", "checked"); 
    // });

    var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
    updateShare(urlFeats);
    // updateHeader(urlFeats);
    $(_.toArray(_.map(urlFeats, function(f) { return "input[data-feature='" + f + "']" })).join()).prop("checked", "checked"); 
    
    $("#search").on('change', function() {
        if(this.value === "") return;
        var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
        urlFeats.push(this.value);
        $(_.toArray(_.map(urlFeats, function(f) { return "input[data-feature='" + f + "']" })).join()).prop("checked", "checked"); 
        window.location.hash = $("input:checked").map(function(val, i) { return $(i).data("feature"); }).toArray().join(",");
        this.value = ""
    });
    }); 
});

var getFeatureArrayFromString = function(str) {
    var feats = str.split(",");
    if(feats.length == 1 && feats[0] === "")  return [];
    return feats
};

var drawPie = function(element, columns, data) {
    var width = 300,
        height = 300,
        radius = Math.min(width, height) / 2;

    var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(function(a, b) { return d3.ascending(a.share, b.share); })
        .value(function(d) { return d.share; });

    var svg = d3.select(element)
        .html("").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc");

    g.append("path")
    .attr("d", arc)
    .style("fill", function(d) { 
        return color(d.data.name);
    })
    .append("svg:title")
    .text(function(d) { return d.data.name + " " + d.data.share.toFixed(2) + "%"; });

    g.append("text")
    .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .style("font-size", function(d) { return Math.min(16, d.data.share) + "px"; })
    .text(function(d) { 
        return d.data.name + " ("  + d.data.share.toFixed(2)  + "%)"; 
    })

};

var drawTable = function(element, columns, data) {

    var table = d3.select(element).html("").append("table"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(col) { 
            return col;
            });

    var rows = tbody.selectAll("tr")
                    .data(data)
                    .enter()
                    .append("tr");

    var cells = rows.selectAll('tr')
                    .data(function(row) {
                        return columns.map(function(col) {
                        if(col === "share") 
                            return {column: col, value:row[col].toFixed(3) + "%"};
                        else if(col === "device")
                            return {column: col, value: "<a href='on" + row[col] + ".iwanttouse.com/'>" + row[col] + "</a>"};
                        else 
                            return {column: col, value: row[col]};
                        })
                    })
                    .enter()
                    .append("td")
                        .classed("versions", function(d) { return d.column === "versions" })
                        .html(function(d) { return d.value; }) 
    
};