/*https://developers.google.com/apps-script/guides/services/external*/

//on twitter gif are videos
function add_image_to_folder(name, image_url, comment, folder)
{
  var type = ((image_url.search('video') != -1) ? ('video/mp4') : ('image/jpeg'));
  try {
    var media = UrlFetchApp.fetch(image_url).getAs(type);
  } catch (err) {
    return (false);
  }
  var file = DriveApp.createFile(media);
  file.setName(name);
  file.setDescription(comment);
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
}

function url_fill(base_url, params)
{
  var url = '';
  for (var param in params)
  {
   if (params[param] && params[param].length > 0)
     url = url + ((url.length > 0) ? ('&') : ('')) + param + '=' + params[param];
  }
  url = base_url + url;
  return (url);
}

function run(count, max_id, user) {
  var service = getService();
  if (service.hasAccess()) {
    var params = {count: count,
                  screen_name: user,
                  max_id: max_id,
                  tweet_mode : 'extended'};
    var url = url_fill('https://api.twitter.com/1.1/favorites/list.json?', params);
    var response = service.fetch(url);
    var result = JSON.parse(response.getContentText());
    return (result);
  } else {
    var authorizationUrl = service.authorize();
    Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
  }
}

function is_extended(dir, tweet, url)
{
  //each tweet will be saved in a folder named by the tweet creator user name
  //each images will be named username + id + time of creation
  var image = url;
  var name = "@" + tweet.user.screen_name;
  var sup_name = " - " + tweet.id + " - " + tweet.created_at;
  var text = tweet.full_text;
  var folders = dir.getFoldersByName(name);
  if (folders.hasNext())
    add_image_to_folder(name + sup_name, image, text, folders.next());
  else
  {
    var new_folder = DriveApp.createFolder(name);
    dir.addFolder(new_folder);
    DriveApp.getRootFolder().removeFolder(new_folder);
    add_image_to_folder(name + sup_name, image, text, new_folder);
  }
}

//check if their is no media, one thing or multiples medias
function pars_result(result, dir)
{
  var cpt = 0;

  while (result[cpt])
  {
    if (Object.keys(result[cpt].entities).length > 4)
    {
      if (result[cpt].extended_entities)
      {
        var medias = get_media_url(result[cpt]);
        if (typeof medias == 'string')
          is_extended(dir, result[cpt], medias);
        else
        {
          for (var i = 0; i < Object.keys(medias).length; i++)
            is_extended(dir, result[cpt], medias[i].media_url_https);
        }
      }
      else
        is_extended(dir, result[cpt], result[cpt].entities.media[i].media_url_https);
    }
    var max_id = result[cpt].id;
    cpt++;
  }
  return (max_id);
}

function get_media_url(tweet)
{
  if (tweet.extended_entities.media[0].video_info)
    return (tweet.extended_entities.media[0].video_info.variants[0].url);
  return (tweet.extended_entities.media);
}

//function to add on trigger (each minutes if you want) to get new tweets
function add_new_fav_tweet()
{
  var dir = DriveApp.getFolderById('');//save folder ID
  var user = '';//Twitter user name
  var result = run('1', '', user);
  var sheet = SpreadsheetApp.openById('');//sheet for tweets ID
  var last_id = sheet.getSheetValues(1, 1, 1, 1)[0][0];
  var id = result[0].id;
  Logger.log(id);
  if (last_id != id)
  {
    pars_result(result, dir);
    sheet.getRange('A1').setValue(id);
  }
}

//function to run the first time, re-run it until you get all your old tweets saved
function main() {
  add_new_fav_tweet();
  return (true);

  var sheet = SpreadsheetApp.openById(''); //sheet for tweets ID
  var dir = DriveApp.getFolderById('');//save folder ID
  var last_id = sheet.getSheetValues(1, 1, 1, 1)[0][0];
  var max_id = ((last_id == '') ? ('') : ('&max_id=' + last_id));
  var user = ''; //Twitter user name

  var result = run('70', max_id, user);//70 to be embarass by Apps Script Time limitation
  max_id = pars_result(result, dir);
  sheet.deleteColumn(1);
  sheet.appendRow([max_id]);
}
