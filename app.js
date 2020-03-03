/* bling.js */
window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function (name, fn) {
  this.addEventListener(name, fn);
}
NodeList.prototype.__proto__ = Array.prototype;
NodeList.prototype.on = NodeList.prototype.addEventListener = function (name, fn) {
  this.forEach(function (elem, i) {
    elem.on(name, fn);
  });
}

// app
var bindFeatureDataList = function(features, required, onItem, sumCurrent) {

    return Object.keys(features).map(function(key){
        var supportedBy = BrowserStats.browsers.browsersByFeature(required.concat(key), ["y", "y x", "a", "a x"]);
        var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
        var difference = (sum / sumCurrent) * 100;
        var actual = sumCurrent - sum;

        return buildAdditionalFeatures({
            "id": key,
            "title": BrowserStats.browsers.getFeature(key).title,
            "difference": difference,
            "actual": sum
        });
    })
};

var buildAdditionalFeatures = function(item) {
    var hue = Math.round(item.difference);
    var pct = item.difference.toFixed(0) + "%";
    return {
        id: item.id,
        title: item.title,
        difference: item.difference,
        actual: item.actual,
        hue: hue,
        pct: pct };
}

document.on('DOMContentLoaded', function() {
    var deviceType = "all";

    BrowserStats.load(deviceType, function(browsers) {
    var features = browsers.features;
    _.each(features, function(itm, idx) { itm.id = idx });

    function updateShare(requiredFeatures) {
        if(!!requiredFeatures === false)  return;
        return bindFeatureDataList(features, requiredFeatures, undefined, 100)
    };

    var urlFeats = getFeatureArrayFromString('');
    var shareResults = updateShare(urlFeats);
    shareResults = _.groupBy(shareResults, function(f){ return f.id });

    var categories = Object.keys(browsers.featureCats).sort();
    var allHTML = categories.map(function(cat){
        var feats = browsers.featureCats[cat];
        var titleHTML = `</ul><h3>${cat}</h3><ul>`;

        // smush those results onto the objects
        feats.forEach(function(feat){ feat.share = shareResults[feat.id][0]; });

        var categoryHTML = feats
          // only include features with a chrome_id.. recent stuff?
        .filter(feat => !!feat.chrome_id)
        .sort(function(a, b) { return b.share.difference - a.share.difference})
        .map(function(feat){
            var adjustedHue = adjustHue(feat.share.hue);
            var color = `hsla(${adjustedHue}, 100%, 42%, 1)`;
            var pct = feat.share.pct;
            var title = feat.title
                .replace(`CSS3 `,``)
                .replace(`CSS `,``)
                .replace(`(rounded corners)`,``);


            return `
            <li data-feature='${feat.id}'>
            <label style='border-color: ${color }' title='${title} — ${escape(feat.description)}'>
                <a href=http://caniuse.com/#feat=${feat.id}>${title}</a>
            </label>
            <span class='pctholder ${(feat.share.difference < 30) ? "lessThan30" : ""}'>
                <span class=featpct style='background-color:${color}; width: ${pct}'><em>${pct}</em></span>
            </span>`;
        }).join("");

        return titleHTML + categoryHTML;
    })
    $("#features").innerHTML = allHTML.join('');


    setupSearch();

    });
});

function escape(str) {
    return str.replace(/'/g, "")
}

var getFeatureArrayFromString = function(str) {
    var feats = str.split(",");
    if(feats.length == 1 && feats[0] === "")  return [];
    return feats
};

function setupSearch() {
    var searchInput = document.getElementById('search');

    searchInput.addEventListener('input', function() {
        document.body.classList.toggle('is-searching', searchInput.value);
    });

    new Jets({
        searchTag: '#search',
        contentTag: '#features > ul'
    });
}

function adjustHue(hue) {
  return Math.pow(hue,3)/10000;
}
