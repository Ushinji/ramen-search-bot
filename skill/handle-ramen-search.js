'use strict';
var request = require('request');

module.exports = class HandlePizzaOrder {
  // コンストラクター。このスキルで必要とする、または指定することができるパラメータを設定します。
  constructor() {
    this.required_parameter = {
      genre: {
        message_to_confirm: {
          type: "template",
          altText: "お好みのジャンルはありますか？以下の中からお選びください。",
          template: {
            type: "buttons",
            text: "お好みのジャンルはありますか？",
            actions: [
                {type:"postback",label:"あっさり",data:"あっさり"},
                {type:"postback",label:"こってり",data:"こってり"},
                {type:"postback",label:"ラーメン二郎",data:"ラーメン二郎"}
            ]
          }
        }
      },
      address: {
        message_to_confirm: {
            type: "text",
            text: "場所の希望を教えてください。"
        }
      }
    };
  }

  // パラメーターが全部揃ったら実行する処理を記述します。
  finish(bot, event, context, resolve, reject){
    this.gnaviSearch(context, function(result){
      let message = {
          location:{
            title:result['name'],
            address:result['address'],
            latitude: Number(result['latitude']),
            longitude: Number(result['longitude'])
          }
      };
      return bot.reply(message).then(
        (response) => {
            return resolve();
        }
      );
    });
  }

  gnaviSearch(context, callback){
    var result = {};
    var options = this.createGnaviOptions(context);
    console.log("body.rest:" + JSON.stringify(options));
    request.get(options, function (error, response, body) {
      if (!error && response.statusCode == 200){
        if('error' in body){
            console.log("検索エラー" + JSON.stringify(body));
            return;
        }
        console.log("body.rest:" + JSON.stringify(body));
        // 店名
        if('name' in body.rest){
            result['name'] = body.rest.name;
        }
        // 住所
        if('address' in body.rest){
            result['address'] = body.rest.address;
        }
        // 緯度
        if('latitude' in body.rest){
            result['latitude'] = body.rest.latitude;
        }
        // 軽度
        if('longitude' in body.rest){
            result['longitude'] = body.rest.longitude;
        }
        // 営業時間
        if('opentime' in body.rest){
            result['opentime'] = body.rest.opentime;
        }
      } else {
          console.log('error: '+ response.statusCode);
      }
      callback(result);
    });
  }

  createGnaviOptions(context) {
    var query = {
      "keyid":process.env.GNAVI_ACCESS_KEY,
      "format":"json",
      "address":context.confirmed.address,
      "hit_per_page":1,
      "category_l":"RSFST08000",  // 大業態コード(ラーメン)
      "freeword":context.confirmed.genre.data,
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
};
