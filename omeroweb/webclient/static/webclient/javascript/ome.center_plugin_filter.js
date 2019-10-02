
console.log('filter');

function MapAnnFilter(image_ids, $element, callback) {

    this.image_ids = image_ids;
    this.filterText = "";
    this.moreLess = "more";

    var $filter = $('<div class="imagefilter filtersearch">' +
        '<select class="choose_map_key">' +
        '</select>' +
        '<select class="map_more_less" style="width: 40px; display:none">' +
            '<option value="more">&gt;</option>' +
            '<option value="less">&lt;</option>' +
            '<option value="moreequal">&ge;</option>' +
            '<option value="lessequal">&le;</option>' +
            '<option value="equal">=</option>' +
        '</select>' +
        '<input class="filter_map_value" />' +
        '<span title="Remove all Key-Value filters" class="removefilter" style="float:left">X</span>' +
    '</div>');

    $element.append($filter);
    $filter.show();

    // Bind event handlers to UI
    $(".choose_map_key", $filter).change(function(event){
        var $this = $(event.target);
        this.currentFilterKey = $this.val();
        this.currentKeyValues = this.usedKeyValues[this.currentFilterKey].values;
        this.keyisNumber = this.usedKeyValues[this.currentFilterKey].type === 'number';

        if (this.keyisNumber) {
            $(".map_more_less", $filter).show();
        } else {
            $(".map_more_less", $filter).hide();
        }
        var placeholder = 'filter text';
        if (this.usedKeyValues[this.currentFilterKey].type === 'number') {
            let min = this.usedKeyValues[this.currentFilterKey].min;
            let max = this.usedKeyValues[this.currentFilterKey].max;
            placeholder = min + '-' + max;
        }
        $('.filter_map_value', $filter).attr('placeholder', placeholder)
            .val('');   // clear filter
        this.filterText = "";
        if (callback) {
            callback();
        }
    }.bind(this));

    $(".filter_map_value", $filter).on('input', function(event){
        this.filterText = $(event.target).val();
        if (callback) {
            callback();
        }
    }.bind(this));

    $(".map_more_less", $filter).change(function(event){
        this.moreLess = $(event.target).val();
        if (callback) {
            callback();
        }
    }.bind(this));

    // Finally, load Map annotations and render
    this.loadAnnotations(function() {
        // {key: {'values':{'imageId': 'val1, val2'}, 'type': 'number'}
        // Render Tag filter chooser, without current filter tags
        var keyList = Object.keys(this.usedKeyValues);
        keyList.sort();
        var html = keyList.map(function(k){
            k = k.escapeHTML();
            return "<option value='" + k + "'>" + k + "</option>";
        }).join("");
        html = "<option value='0'>Choose Key</option>" + html;
        $(".choose_map_key", $filter).html(html);
    }.bind(this));
}

MapAnnFilter.prototype.isImageVisible = function(iid) {
    // Visible if number or string matches
    var visible;
    var text = this.filterText;
    // If image doesn't have matching key, hide
    if (!this.currentKeyValues[iid]) {
        visible = false;
    } else if (text.length === 0) {
        visible = true;
    } else if (this.keyisNumber) {
        let cutoff = parseFloat(text);
        this.currentKeyValues[iid].forEach(function(v){
            // compare: more, less, moreequal, lessequal, equal
            if (v == cutoff && this.moreLess.indexOf('equal') > -1) {
                visible = true;
            } else if (v > cutoff && this.moreLess.indexOf('more') === 0) {
                visible = true;
            } else if (v < cutoff && this.moreLess.indexOf('less') === 0) {
                visible = true;
            }
        }.bind(this));
    } else {
        this.currentKeyValues[iid].forEach(function(v){
            if (v.toLowerCase().indexOf(text.toLowerCase()) > -1) {
                visible = true;
            }
        });
    }
    return visible;
}


MapAnnFilter.prototype.loadAnnotations = function(callback) {

    var query = "image=" + this.image_ids.join("&image=");
    var url = WEBCLIENT.URLS.webindex + 'api/annotations?type=map&' + query;
    $.getJSON(url, function(data){
        // map imageId to... {key: {'values':{'imageId': 'val1, val2'}, 'type': 'number'}
        this.usedKeyValues = data.annotations.reduce(function(prev, ann){
            let values = ann.values;
            let iid = ann.link.parent.id;
            for (let i=0; i<values.length; i++) {
                let key = values[i][0];
                let val = values[i][1];
                if (val.length == 0) continue;

                if (!prev[key]) {
                    prev[key] = {values: {}, type: 'number', min: Infinity, max: -Infinity};
                }
                if (isNaN(val)) {
                    prev[key].type = 'string';
                } else {
                    val = parseFloat(val);
                    prev[key].min = Math.min(val, prev[key].min);
                    prev[key].max = Math.max(val, prev[key].max);
                }
                if (!prev[key].values[iid]) {
                    prev[key].values[iid] = [val];
                } else {
                    prev[key].values[iid].push(val);
                }
            }
            return prev;
        }, {});

        if (callback) {
            callback();
        }
    }.bind(this));
}