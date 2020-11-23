const cool = require('cool-ascii-faces')
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fetch = require('node-fetch');
var fs = require('fs');
const { text } = require('express')

var urlencodedparser = bodyParser.urlencoded({ extended: false })

// UTILITY FUNCTIONS

function doGetRequest(url) {
  /*
      How to use?
      
      doGetRequest('https://fakestoreapi.com/products/').then(response => {
          // TODO
      })
  */
  return fetch(url)
    .then(res => res.json())
    .then(json => {
      return json
    })
    .catch(error => console.warn(error))
}


function doPostRequest(url, data) {
  /*
      How to use?
      
      doPostRequest('https://fakestoreapi.com/products/', data).then(response => {
          // TODO
      })
  */
  console.log("Data ---> ", data)
  return fetch(url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": '*/*'
      },
      body: JSON.stringify({
        data
      }),
    })
    .then(res => {
      return res
    })
    .catch(error => console.warn(error))
}


function getHtmlTemplate(template_folder) {
  var templateDir = __dirname + '/views/templates/' + template_folder + '/index.html'

  var text = fs.readFileSync(templateDir, "utf-8");

  return text;

}

function getProductCartTemplate() {
  var cardTemplate = `
                        <tr>
                          <td style="padding-top: 20px; padding-right: 10px;">
                            <img src=" <cid_replace/> " style='width: 500px;' />
                            <div class="text-tour"
                              style="text-align: center;">
                              <h3><a href="#"> <name_replace/> </a>
                              </h3>
                              <span class="price"> $ <price_replace/> </span>
                            </div>
                          </td>
                        </tr>
                      `
  return cardTemplate
}


function generateRandomCid() {

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  alphabet = "abcdefghijklmnopqrstuvwxyz"

  randomCid = ""

  for (let index = 0; index <= 10; index++) {
    randIndex = getRandomInt(alphabet.length)
    randomCid += alphabet[randIndex]
  }

  return randomCid + "@kreata.ee"
}


// SERVER FUNCTIONS

express()
  // CONFIGURATION OF THE SERVER
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .use(bodyParser.json())

  // API FUNCTIONS
  //.get('/', (req, res) => res.render('pages/index'))
  .post('/cool', (req, res) => res.send(cool()))

  .post('/simple_request', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.name + ' ' + req.body.age)
    res.send(true)
  })

  // NEW PURCHASE
  .post('/NEW_PURCHASE', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.name)
    console.log('data:' + req.body.email)
    console.log('data:' + req.body.pedido)
    console.log('data:' + req.body.state)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var nameToSend = req.body.name
    var products = req.body.pedido
    var timeP = req.body.state

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('new_purchase')
    htmlText = htmlText.replace("<name_replace/>", nameToSend).replace("<email_replace/>", emailToSend).replace("<time_replace/>", timeP)

    var productsInString = '';

    attachmentsObject = []

    //2. Get the purchases products.

    productsIdArray = []

    products.forEach(product => {
      productsIdArray.push(product.codigoProducto)
    });

    console.log("IDS DE LOS PRODUCTOS: ")
    console.log(productsIdArray)

    // 3. Fetch existant products.

    productsArray = []

    fetch('https://mod3-jafjdugfba-uc.a.run.app/general',
      {
        method: 'GET',
        headers: {
          "Content-Type": 'application/json',
          "Accept": '*/*'
        }
      }).then(response => response.json())
      .then(data => {
        console.log(data)
        productsArray = data

        //console.log("Products Array :" + productsArray)

        // Send the mail after

        productsArray.forEach((product) => {

          if (!productsIdArray.includes(product.idProducto.toString())) {
            console.log("NO INCLUYE: " + product.idProducto)
            return
          }
          else {
            console.log("INCLUYE: " + product.idProducto)
          }

          console.log('nombre: ' + product.nombre);
          console.log('url: ' + product.url);
          console.log('precioVenta: ' + product.precioVenta);

          var template = getProductCartTemplate()

          randomCid = generateRandomCid()

          attachment = {
            filename: randomCid + '.png',
            path: product.url,
            cid: randomCid //same cid value as in the html img src
          }

          //console.log(attachment)

          template = template.replace("<name_replace/>", product.nombre).replace("<cid_replace/>", randomCid).replace("<price_replace/>", product.precioVenta)
          console.log("TEMPLATE: ")
          console.log(template)

          productsInString += template

          attachmentsObject.push(attachment)

        });

        htmlText = htmlText.replace("<products_replace/>", productsInString)

        //console.log(htmlText)


        let mailOptions = {
          from: 'diz.clientes@gmail.com',
          to: emailToSend,
          subject: 'Compra exitosa.',
          html: htmlText,
          attachments: attachmentsObject
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error.message);
            res.send(false)
          } else {
            console.log('success');
            res.send(true)
          }
        });

      })


  })

  // ITEM LEFT
  .post('/ITEMS_LEFT', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.name)
    console.log('data:' + req.body.email)
    console.log('data:' + req.body.carritoInfo)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var nameToSend = req.body.name
    var products = req.body.carritoInfo

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('cart_products')
    htmlText = htmlText.replace("<name_replace/>", nameToSend).replace("<email_replace/>", emailToSend)

    var productsInString = '';

    attachmentsObject = []

    // 2. Get the cart products

    productsIdArray = []

    products.forEach(product => {
      productsIdArray.push(product.codigoProducto)
    });

    console.log("IDS DE LOS PRODUCTOS: ")
    console.log(productsIdArray)

    // 3. Fetch existant products.

    productsArray = []

    fetch('https://mod3-jafjdugfba-uc.a.run.app/general',
      {
        method: 'GET',
        headers: {
          "Content-Type": 'application/json',
          "Accept": '*/*'
        }
      }).then(response => response.json())
      .then(data => {
        console.log(data)
        productsArray = data

        //console.log("Products Array :" + productsArray)

        // Send the mail after

        productsArray.forEach((product) => {

          if (!productsIdArray.includes(product.idProducto.toString())) {
            console.log("NO INCLUYE: " + product.idProducto)
            return
          }
          else {
            console.log("INCLUYE: " + product.idProducto)
          }

          console.log('nombre: ' + product.nombre);
          console.log('url: ' + product.url);
          console.log('precioVenta: ' + product.precioVenta);

          var template = getProductCartTemplate()

          randomCid = generateRandomCid()

          attachment = {
            filename: randomCid + '.png',
            path: product.url,
            cid: randomCid //same cid value as in the html img src
          }

          //console.log(attachment)

          template = template.replace("<name_replace/>", product.nombre).replace("<cid_replace/>", randomCid).replace("<price_replace/>", product.precioVenta)
          console.log("TEMPLATE: ")
          console.log(template)

          productsInString += template

          attachmentsObject.push(attachment)

        });

        htmlText = htmlText.replace("<products_replace/>", productsInString)

        //console.log(htmlText)


        let mailOptions = {
          from: 'diz.clientes@gmail.com',
          to: emailToSend,
          subject: 'Productos pendientes en el carrito.',
          html: htmlText,
          attachments: attachmentsObject
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error.message);
            res.send(false)
          } else {
            console.log('success');
            res.send(true)
          }
        });
      })

  })

  // NEW USER
  .post('/NEW_USER', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.nombrePila)
    console.log('data:' + req.body.correo)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.correo
    var nameToSend = req.body.nombrePila

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('new_user')
    htmlText = htmlText.replace("<name_replace/>", nameToSend).replace("<email_replace/>", emailToSend)

    let mailOptions = {
      from: 'diz.clientes@gmail.com',
      to: emailToSend,
      subject: '¡Nuevo usuario registrado!',
      html: htmlText
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error.message);
        res.send(false)
      } else {
        console.log('success');
        res.send(true)
      }
    });
  })

  // PAYMENT ERROR
  .post('/PAYMENT_ERROR', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.name)
    console.log('data:' + req.body.email)
    //console.log('data:' + req.body.orderNumber)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var nameToSend = req.body.name
    //var numberOrderToSend = req.body.orderNumber

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('payment_error')
    htmlText = htmlText.replace("<name_replace/>", nameToSend).replace("<email_replace/>", emailToSend)

    let mailOptions = {
      from: 'diz.clientes@gmail.com',
      to: emailToSend,
      subject: 'Pago declinado.',
      html: htmlText
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error.message);
        res.send(false)
      } else {
        console.log('success');
        res.send(true)
      }
    });
  })

  // RECOMMENDED ITEMS
  .post('/RECOMMENDED_ITEMS', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.name)
    console.log('data:' + req.body.email)
    console.log('data:' + req.body.products)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var nameToSend = req.body.name
    var products = req.body.products

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('recommended_products')
    htmlText = htmlText.replace("<name_replace/>", nameToSend).replace("<email_replace/>", emailToSend)

    var productsInString = '';

    attachmentsObject = []

    // 2. Get the cart products

    productsIdArray = []

    products.forEach(product => {
      productsIdArray.push(product.codigoProducto)
    });

    console.log("IDS DE LOS PRODUCTOS: ")
    console.log(productsIdArray)

    // 3. Fetch existant products.

    productsArray = []

    fetch('https://mod3-jafjdugfba-uc.a.run.app/general',
      {
        method: 'GET',
        headers: {
          "Content-Type": 'application/json',
          "Accept": '*/*'
        }
      }).then(response => response.json())
      .then(data => {
        console.log(data)
        productsArray = data

        //console.log("Products Array :" + productsArray)

        // Send the mail after

        productsArray.forEach((product) => {

          if (!productsIdArray.includes(product.idProducto.toString())) {
            console.log("NO INCLUYE: " + product.idProducto)
            return
          }
          else {
            console.log("INCLUYE: " + product.idProducto)
          }

          console.log('nombre: ' + product.nombre);
          console.log('url: ' + product.url);
          console.log('precioVenta: ' + product.precioVenta);

          var template = getProductCartTemplate()

          randomCid = generateRandomCid()

          attachment = {
            filename: randomCid + '.png',
            path: product.url,
            cid: randomCid //same cid value as in the html img src
          }

          //console.log(attachment)

          template = template.replace("<name_replace/>", product.nombre).replace("<cid_replace/>", randomCid).replace("<price_replace/>", product.precioVenta)
          console.log("TEMPLATE: ")
          console.log(template)

          productsInString += template

          attachmentsObject.push(attachment)

        });

        htmlText = htmlText.replace("<products_replace/>", productsInString)

        //console.log(htmlText)


        let mailOptions = {
          from: 'diz.clientes@gmail.com',
          to: emailToSend,
          subject: 'Recomendaciones para ti.',
          html: htmlText,
          attachments: attachmentsObject
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error.message);
            res.send(false)
          } else {
            console.log('success');
            res.send(true)
          }
        });
      })
  })

  // TEMPORAL PASSWORD
  .post('/PASSWORD', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.email)
    console.log('data:' + req.body.password)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var passwordToSend = req.body.password

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('password')
    htmlText = htmlText.replace("<password_replace/>", passwordToSend).replace("<email_replace/>", emailToSend)

    let mailOptions = {
      from: 'diz.clientes@gmail.com',
      to: emailToSend,
      subject: 'Password Temporal',
      html: htmlText
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error.message);
        res.send(false)
      } else {
        console.log('success');
        res.send(true)
      }
    });
  })

  // TOKEN
  .post('/TOKEN', urlencodedparser, function (req, res) {
    console.log('data:' + req.body.email)
    console.log('data:' + req.body.password)

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'diz.clientes@gmail.com',
        pass: 'estaeslapassword'
      }
    });

    var emailToSend = req.body.email
    var passwordToSend = req.body.password

    // 1. Fetch html content.
    htmlText = getHtmlTemplate('token')
    htmlText = htmlText.replace("<password_replace/>", passwordToSend).replace("<email_replace/>", emailToSend)

    let mailOptions = {
      from: 'diz.clientes@gmail.com',
      to: emailToSend,
      subject: 'Token',
      html: htmlText
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error.message);
        res.send(false)
      } else {
        console.log('success');
        res.send(true)
      }
    });
  })


  // CONFIGURATION OF THE PORT
  .listen(PORT, () => console.log(`Listening on ${PORT}`))



// SIMULATION OF THE REQUESTS

// This function recommends products every Friday at 9:00 a.m. UDT.
cron.schedule('0 9 * * Friday', function () {
  simulateRecommendations()
});



function simulateRecommendations() {

  var recommendedProducts = []
  var alreadyAddedProducts = []

  function between(min, max) {
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

  doGetRequest('https://fakestoreapi.com/products/').then(response => {
    for (let index = 0; index < 5; index++) {

      var rand = between(0, 20)

      if (alreadyAddedProducts.includes(rand) == false) {
        alreadyAddedProducts.push(rand)

        newProduct = {
          "name": response[rand]["title"],
          "img": response[rand]["image"],
          "price": response[rand]["price"]
        }

        recommendedProducts.push(newProduct)

      } else {
        index--;
        console.log("Product repeated!")
      }
    }
    console.log(recommendedProducts)

    /*var name = response["name"]
    var email = response["email"]
    var products = response["products"]*/

    var name = "Giss Ortiz"
    var email = "gmol013@hotmail.com"
    var products = recommendedProducts


    fetch('https://diz-marketing.herokuapp.com/RECOMMENDED_ITEMS',
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json',
          "Accept": '*/*'
        },
        body: JSON.stringify({
          "name": name,
          "email": email,
          "products": products
        }),
      }).then(response => {
        console.log(response)
      })
  })
}

// UNCOMMENT TO SIMULATE INSTANTLY  - How tu run? > heroku local
 //simulateRecommendations()
