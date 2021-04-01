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

    let totalFeatures = 0;

    var categories = Object.keys(browsers.featureCats).sort();
    var allHTML = categories.map(function(cat){
        const feats = browsers.featureCats[cat];
        const titleHTML = `</ul><h3>${cat}</h3><ul>`;

        // smush those results onto the objects
        feats.forEach(function(feat){ feat.share = shareResults[feat.id][0]; });

        const categoryHTML = feats
        // only include features with a chrome_id.. recent stuff?  Cool, but there are decent things without a chrome_id.
        // .filter(feat => !feat.chrome_id)
        // INSTEAD.. filter out the obvious things
        // .filter(feat => feat.share.difference < (!!new URL(location.href).searchParams.get('all') ? Infinity : 98))
        .filter(feat => feat.share.difference < (!!new URL(location.href).searchParams.has('all') ? 9000 : 98))
        .map(feat => { feat.totalSupport = feat.usage_perc_a + feat.usage_perc_y; return feat; })
        .sort(function(a, b) { return b.totalSupport - a.totalSupport})
        .map(function(feat){
            // we're using a hue that's not based off our totalSupport prop.  this leads to weirdness with `:is() pseudo-class` ... but i have no idea why.
            var adjustedHue = adjustHue(feat.share.hue);
            var color = `hsla(${adjustedHue}, 100%, 42%, 1)`;

            var partialColor = `hsla(${adjustedHue}, 90%, 39.6%, 1)`;
            const fullSupportPct = feat.usage_perc_y;
            const partialSupportPct = feat.usage_perc_a;

            var roundedPct = feat.share.pct;
            var pct = `${escape(feat.totalSupport.toLocaleString(undefined, {maximumFractionDigits: 1}))}%`;
            var title = feat.title
                .replace(`CSS3 `,``)
                .replace(`CSS `,``)
                .replace(`(rounded corners)`,``);

            totalFeatures++;
            allfeats.push(feat);

            return `
            <li data-feature='${feat.id}'>
                <label style='border-color: ${color }' title='${title} — ${escape(feat.description)}'>
                    <a href=http://caniuse.com/#feat=${feat.id}>${title}</a>
                </label>
                <span class='pctholder ${(feat.share.difference < 30) ? "lessThan30" : ""}'>
                    <em>${pct}</em>
                    <span class=featpct
                        style='background-color:${color}; width: ${fullSupportPct}%'>
                    </span><span class='featpct featpct--partial'
                        style='background: repeating-linear-gradient(
                            -45deg,
                            ${color},
                            ${color} 10px,
                            ${partialColor} 10px,
                            ${partialColor} 20px
                          );
                           width: ${partialSupportPct}%'>
                    </span>
                </span>`;
        }).join("");

        // dont make a heading for an empty section (CSS2)
        if (!categoryHTML) return '';

        return titleHTML + categoryHTML;
    })
    $("#features").innerHTML = allHTML.join('');

    $('#search').placeholder = `Filter across ${totalFeatures.toLocaleString()} features…`;

    setupSearch();

    updateDates(browsers);

    });
});

window.allfeats = [];

function escape(str) {
    return str.replace(/'/g, "")
}

var getFeatureArrayFromString = function(str) {
    var feats = str.split(",");
    if(feats.length == 1 && feats[0] === "")  return [];
    return feats
};

function updateDates(browsers) {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    $('#caniuse-date').textContent = new Date(browsers.updated * 1000).toLocaleDateString(undefined, dateOptions);
}

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
