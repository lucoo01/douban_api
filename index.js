// 云函数入口文件
const axios = require('axios')
const doubanbook = require('doubanbook')
const cheerio = require('cheerio')

const Koa = require('koa');
const app = new Koa();

async function searchDouban(isbn){
  const url = "https://book.douban.com/subject_search?search_text="+isbn
  let searchInfo = await axios.get(url)
  // 搜索到的结果
//  console.log("搜索到的结果")
//  console.log(searchInfo.data)
  let reg = /window\.__DATA__ = "(.*)"/
  if(reg.test(searchInfo.data)){
    // 数据解密
    let searchData = doubanbook(RegExp.$1)[0]
    return searchData
  }
}
async function getComments(url){
    let commentUrl = url+'comments' 
    console.log(commentUrl)
    const commentpage = await axios.get(commentUrl)
    const $ = cheerio.load(commentpage.data)

    let comments = []


//   let comments = []
  $('#comments .comment-item').each((i,v)=>{
    if(i>5){
        return 
    }
    const rating = $(v).find('.comment-info>.rating').attr('class')
    let rate = '0'
    if(rating){
        const index = rating.indexOf("allstar")
        if(index>-1){
            rate = rating[index+7] + ''
        }
    }


    comments.push({
        rate,
        user:$(v).find('.avatar>a').attr('title'),
        img:$(v).find('.avatar>a>img').attr('src'),
        date:$(v).find('.comment-info').children().last().text(),

        content:$(v).find('.short').text()
    })
    // $(v)
  })

  
  return comments
    // const url = `https://book.douban.com/subject/2567698/comments/`
}


async function getDouban(isbn){
  const detailInfo = await searchDouban(isbn)
//  console.log("解密后的数据:")
//  console.log(detailInfo)
  const detailPage = await axios.get(detailInfo.url)

  
//  const comments = await getComments(detailInfo.url)
//
//
//  console.log("短评信息:")
//  console.log(comments)
  
  const $ = cheerio.load(detailPage.data)
  const info = $('#info').text().split('\n').map(v=>v.trim()).filter(v=>v)
//   console.log(info)
  let author = info[1]
  let publisher, price
  info.forEach(v=>{
    let temp = v.split(':')
    if(temp[0]=='出版社'){
      publisher = temp[1]
    }
    if(temp[0]=='定价'){
      price = temp[1]
    }
  })
  let tags = []
  $('#db-tags-section a.tag').each((i,v)=>{
    tags.push({
      title: $(v).text()
    })
  })



  let indent = $("div[id*='_full'].indent").text()

  if( $("div[id*='_full'].indent").length == 0 ){
	
  	indent = $("div[id*='_short'].indent").text()
  }

  indent = indent.trim()

//  console.log('indent:')
//  console.log(indent)

  // 分类tags
  // 价格price
  // 出版社 publisher
  // 作者author
  const ret = {
    create_time: new Date().getTime(),
    //comments,
    indent: indent,
    tags,
    author,
    publisher,
    price,
    image: detailInfo.cover_url,
    rate:detailInfo.rating.value,
    alt: detailInfo.url,
    title:detailInfo.title,
    summary: $('#link-report .intro').text(),
    detailInfo: detailInfo
  }
//  console.log(ret)
  return ret
}



app.use(async ctx => {
	let query = ctx.request.query;
	let bookinfo = [];
	if('isbn' in query){

		bookinfo = await getDouban(query['isbn'])

		console.log(bookinfo)
		
	}
	
  	ctx.body = JSON.stringify(bookinfo);
  
});

app.listen(8800);


//console.log('搜索isbn9787536692930的信息')
//getDouban("9787536692930")
