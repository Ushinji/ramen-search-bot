
function createGnaviOptions(context) {
  var query = {
    "keyid":process.env.GNAVI_ACCESS_KEY,
    "format":"json",
    "address":context.confirmed.address,
    "hit_per_page":1,
    "category_l":"RSFST08000",  // 大業態コード(ラーメン)
    "freeword":convertEntityData(context.confirmed.genre),
    "freeword_condition":1
  };
  var options = {
      url: 'https://api.gnavi.co.jp/RestSearchAPI/20150630/',
      headers : {'Content-Type' : 'application/json; charset=UTF-8'},
      qs: query,
      json: true
  };
  return options;
}

function convertEntityData(entity){
  if( !isString(entity) && 'data' in entity ){
      return entity.data;
  }
  return entity;
}

function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
}

var context = require('./test.json');
var options = createGnaviOptions(context);
console.log(options);
