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
                  altText: `確認ですが、${value}でよろしいですか？`,
                  template: {
                    type: "confirm",
                    text: `確認ですが、${value}でよろしいですか？`,
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
                      bot.queue({text: `分かりました。以上で調べてみます。`});
                    } else {
                      bot.queue({text: "お手数ですが、もう一度入力お願いします。"});
                      bot.collect("address");
                    }
                    return resolve();
                }
              }
            });
          } else {
              bot.queue({text: `申し訳ありません。うまく理解できなかったので、もう一度入力してください。`});
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
    this.gnaviSearch(context, function(result){
      let message = {
          "type":"text",
          "text":"こちらはいかがですか？\n【お店】" + result['name'] + "\n【URL】 " + result['url'],
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
    var result = {};
    var options = this.createGnaviOptions(context);
    console.log("body.rest:" + JSON.stringify(options));
    request.get(options, function (error, response, body) {
      if (!error && response.statusCode == 200){
        if('error' in body){
          console.log("検索エラー" + JSON.stringify(body));
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
        // URL
        if('url' in body.rest){
            result['url'] = body.rest.url;
        }
      } else {
          console.log('error: '+ response.statusCode);
      }
      callback(result);
    });
  }
  // ぐるなびAPIへ送信する際のオプションを作成
  createGnaviOptions(context) {
    var query = {
      "keyid":process.env.GNAVI_ACCESS_KEY,
      "format":"json",
      "address":context.confirmed.address,
      "hit_per_page":1,
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
};
