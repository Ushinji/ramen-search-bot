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
        },
        reaction: (error, value, bot, event, context, resolve, reject) => {
            if (error){
                return resolve();
            }
          var genre = this.convertEntityData(value);
          bot.queue({text: `${genre}ですね。OKです。`});
          return resolve();
        }
      },
      address: {
        message_to_confirm: {
            type: "text",
            text: "場所の希望を教えてください(例:渋谷)"
        },
        reaction: (error, value, bot, event, context, resolve, reject) => {
          if(value){
            // We got Lastname & Firstname so going to check with user if this is correct.
            bot.collect({
              is_name_correct: {
                message_to_confirm: {
                  type: "template",
                  altText: `確認です！${value}でよろしいですか？`,
                  template: {
                    type: "confirm",
                    text: `確認です！${value}でよろしいですか？`,
                    actions: [
                      {type: "message", label: "はい", text: "はい"},
                      {type: "message", label: "いいえ", text: "いいえ"}
                    ]
                  }
                },
                parser: (value, bot, event, context, resolve, reject) => {
                  const acceptable_values = ["はい", "いいえ"];
                  if (acceptable_values.indexOf(value) >= 0){
                    return resolve(value);
                  }
                  return reject();
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();
                    if (value == "はい"){
                      bot.queue({text: `分かりました。ご希望のラーメン店を探してみます！`});
                    } else {
                      bot.queue({text: "分かりました。お手数ですが、もう一度入力お願いします。"});
                      bot.collect("address");
                    }
                    return resolve();
                }
              }
            });
          } else {
              bot.queue({text: `申し訳ありません。よく分からなかったので、もう一度入力してください。`});
              bot.collect("address");
          }
          return resolve();
        }
      },
    };
  }
  
  // パラメーターが全部揃ったら実行する処理
  finish(bot, event, context, resolve, reject){
    console.log("context.rest:" + JSON.stringify(context));
    var gnaviBody = {};
    this.gnaviSearch(context, function(gnaviBody){
      var columns = this.createCarouselColums(gnaviBody);
      let message = {
        "type":"template",
        "altText": "this is a carousel template",
        "template": {
          "type": "carousel",
          "columns": columns
        }
      };
      return bot.reply(message).then(
        (response) => {
          return resolve();
        }
      );
    });
  }

　// ぐるなびAPIに検索条件を送信し、検索結果を取得
  gnaviSearch(context, callback){
    var options = this.createGnaviOptions(context);
    console.log("body.rest:" + JSON.stringify(options));
    request.get(options, function (error, response, body) {
      var result = {};
      if (!error && response.statusCode == 200){
        if('error' in body){
          console.log("検索エラー");
        }
        console.log("body.rest:" + JSON.stringify(body));
      } else {
        console.log('error: '+ response.statusCode);
      }
      callback(body);
    });
  }

  // ぐるなびAPIへ送信する際のオプションを作成
  createGnaviOptions(context) {
    var query = {
      "keyid":process.env.GNAVI_ACCESS_KEY,
      "format":"json",
      "address":context.confirmed.address,
      "hit_per_page":3,
      "category_l":"RSFST08000",  // 大業態コード(ラーメン)
      "freeword":this.convertEntityData(context.confirmed.genre),
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

  // entityの形式変換（"{ data: 'entity-data' }"→"='entity-data'"）
  convertEntityData(entity){
    if( !this.isString(entity) && 'data' in entity ){
      return entity.data;
    }
    return entity;
  }

  // 指定オブジェクトが文字列型か判定するメソッド
  isString(obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  }

  createCarouselColums(body){
    //コールバックで色々な処理
    var columns = [];
    for (var rest of body.items) {
      columns.push({
        "thumbnailImageUrl": rest.image_url.shop_image1,
        "title": rest.name,
        "text": rest.pr.pr_short ? rest.pr.pr_short.substr(0, 60) : ' ', // title指定時は60文字以内,
        "actions": [{
          "type": "uri",
          "label": "紹介ページへ移動",
          "uri": rest.url
        }]
      });
      // carouselは最大5つのため、6つ以降はカット。
      if (columns.length === 5) break;
    }
    return columns;
  }
};
