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
          bot.queue({text: `「${genre}」ですね。OKです。`});
          return resolve();
        }
      },
      address: {
        message_to_confirm: {
            type: "text",
            text: "場所の希望を教えてください"
        },
        reaction: (error, value, bot, event, context, resolve, reject) => {
          if(value){
            // We got Lastname & Firstname so going to check with user if this is correct.
            bot.collect({
              is_name_correct: {
                message_to_confirm: {
                  type: "template",
                  altText: `「${value}」でよろしいですか？`,
                  template: {
                    type: "confirm",
                    text: `場所は「${value}」でよろしいですか？`,
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
                      bot.queue({text: `こちらのラーメン屋さんはいかがですか？`});
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
    var gnavi_body = {};
    this.gnaviSearch(context, function(gnavi_body){
      // カルーセル型メッセージ作成
      var columns = [];
      var url_no_image = 'https://ramen-search-bot.herokuapp.com/public/images/no_image.png';
      console.log(`body.rest:${JSON.stringify(gnavi_body)}`);

      // 結果が一件のみならば、結果を複数件数と同様に配列形式へ変換
      var rests = [];
      if (gnavi_body.total_hit_count === 1) {
        rests.push(gnavi_body.rest);
      } else {
        for (var rest of gnavi_body.rest) {
          rests.push(rest);
        }
      }

      // carouselのメッセージ作成
      for (var rest of rests) {
        columns.push({
          "thumbnailImageUrl": typeof rest.image_url.shop_image1 == 'string' ? rest.image_url.shop_image1 : url_no_image,
          "title": rest.name,
          "text": typeof rest.pr.pr_short == 'string' ? rest.pr.pr_short.substr(0, 60) : ' ',
          "actions": [{
            "type": "uri",
            "label": "紹介ページへ移動",
            "uri": rest.url
          }]
        });
        // carouselは最大5つのため、6つ以降はカット。
        if (columns.length == 5) break;
      }

      var message = {
        "type":"template",
        "altText": "this is a carousel template",
        "template": {
          "type": "carousel",
          "columns": columns
        }
      };
      console.log(`reply-msg:${JSON.stringify(message)}`);

      // 最終的な応答を返す
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

/*
  createCarouselMessage(body, callback){
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
    // carouselのメッセージ作成
    var message = {
      "type":"template",
      "altText": "this is a carousel template",
      "template": {
        "type": "carousel",
        "columns": columns
      }
    };
    callback(message);
  }
*/
};
