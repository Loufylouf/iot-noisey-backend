const express               = require('express');
const React                 = require('react');
const ReactDOMServer        = require('react-dom/server');
const Reactstrap            = require('reactstrap') ;
const { exec }              = require('child_process');

function DeviceLayout(props)
{
  return React.createElement(Reactstrap.Container, {fluid: true}, React.createElement(Reactstrap.Row, {id: props.id, className: props.className}, props.children) ) ;
}

function DeviceCard(props) 
{
  // Avoid complex existence checking
  if ( typeof props.device.config == "undefined" )
    props.device.config = {} ;
  if ( typeof props.device.config.updateRate == "undefined" )
    props.device.config.updateRate = 1 ;  

  return React.createElement(Reactstrap.Col, {xs: props.width}, 
    React.createElement( Reactstrap.Card, {id: props.device.fullID},
      React.createElement(Reactstrap.CardHeader, {}, "Configuration Noisey n°" + props.device.fullID),
      React.createElement("div", {className: "card-body"}, 
        React.createElement("form", {}, 
          React.createElement("div", {className: "form-group"}, 
            React.createElement("label", {htmlFor: "name-"+props.device.fullID}, "Nom Noisey" ),
            React.createElement("input", {type: "text", className: "form-control", id: "name-"+props.device.fullID, value: (typeof props.device.config.name == "undefined" ? '' : props.device.config.name), placeholder: "Entrez un nom pour ce Noisey" } ),
          ),
          React.createElement("div", {className: "form-group"}, 
            React.createElement("label", {htmlFor: "luminosity-"+props.device.fullID}, "Luminosité" ),
            React.createElement("input", {type: "number", className: "form-control", id: "luminosity-"+props.device.fullID, value: (typeof props.device.config.luminosity == "undefined" ? 5 : props.device.config.luminosity), min: 0, max: 10, step: 1, "aria-describedby": "helpLuminosity-"+props.device.fullID } ),
            React.createElement("small", {className: "form-text text-muted", id: "helpLuminosity-"+props.device.fullID }, "Intensité lumineuse de l'anneau de LEDs : 0 = anneau désactivé, 10 = intensité maximale" ),
          ),
          React.createElement("div", {className: "form-group"}, 
            React.createElement("label", {htmlFor: "minNoiseLevel-"+props.device.fullID}, "Bruit min" ),
            React.createElement("input", {type: "number", className: "form-control", id: "minNoiseLevel-"+props.device.fullID, value: (typeof props.device.config.minNoiseLevel == "undefined" ? 20 : props.device.config.minNoiseLevel), min: 0, max: 449, step: 1, "aria-describedby": "helpminNoiseLevel-"+props.device.fullID } ),
            React.createElement("small", {className: "form-text text-muted", id: "helpminNoiseLevel-"+props.device.fullID }, "Niveau de bruit minimal pour que se déclenche l'anneau lumineux (éteint en dessous)" ),
          ),
          React.createElement("div", {className: "form-group"}, 
            React.createElement("label", {htmlFor: "maxNoiseLevel-"+props.device.fullID}, "Bruit max" ),
            React.createElement("input", {type: "number", className: "form-control", id: "maxNoiseLevel-"+props.device.fullID, value: (typeof props.device.config.maxNoiseLevel == "undefined" ? 60 : props.device.config.maxNoiseLevel), min: 1, max: 450, "aria-describedby": "helpmaxNoiseLevel-"+props.device.fullID } ),
            React.createElement("small", {className: "form-text text-muted", id: "helpmaxNoiseLevel-"+props.device.fullID }, "Niveau de bruit maximal auquel l'anneau est rouge." ),
          ),
          React.createElement("div", {className: "form-group"}, 
            React.createElement("label", {htmlFor: "updateRate-"+props.device.fullID}, "Fréquence envoi des données" ),
            React.createElement("select", {className: "form-control", id: "updateRate-"+props.device.fullID, "aria-describedby": "helpupdateRate-"+props.device.fullID, defaultValue: props.device.config.updateRate }, 
              React.createElement("option", {value: 0}, "Faible" ),
              React.createElement("option", {value: 1}, "Moyenne" ),
              React.createElement("option", {value: 2}, "Élevée" ),
            ),
            React.createElement("small", {className: "form-text text-muted", id: "helpupdateRate-"+props.device.fullID }, "Plus l'envoi des données est fréquent, moins la batterie tiendra. Dans tous les cas, toutes les données seront envoyées." ),
          ),
        )
      )
    ) 
  ) ; 
}


module.exports = db => 
{
  const router = express.Router();

  // Wrap an async function so we catch any errors that might occur
  const wrapAsync = handler => (req, res) => handler(req)
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: error.message }))


  // Handle post message to root
  router.post('/', (req, res, next) =>  
  {
    res.json({fullID: req.body.fullID }) ;

    // Search for a device with this full ID
    db.collection('devices').find({fullID: parseInt(req.body.fullID)}).toArray(function (error, results) 
    {
      if (error) 
        throw error;

      // A device has been found, 
      if ( results.length > 0 )
      {
        let update = { $set : {} };
        update.$set['config.' + req.body.field] = req.body.value ; 
        
        db.collection("devices").updateOne({'_id' : results[0]._id}, update, function(err, res) { if (err) console.log(err) ; } ) ;
      }
    });
  }) ;


  // Get the config panel
  router.get('/',(req, res, next) => 
  {
    return db.collection('devices').find().toArray(function(err, results) 
    {
      let devices = [] ; 
      let width = (results.length >= 3 ? 4 : (results.length >= 2 ? 6 : 12) ) ; 

      for ( let device of results )
      {
        devices.push( React.createElement(DeviceCard, {device: device, width: width} ) ) ; 
      }

      let container = ReactDOMServer.renderToString( React.createElement(DeviceLayout, {id: "config"}, devices ) )  ;

      let navbar = ReactDOMServer.renderToString( 
        React.createElement(Reactstrap.Navbar, {className: "navbar-dark bg-dark mb-4 navbar-expand-lg"}, 
          React.createElement(Reactstrap.NavbarBrand, {href: "/"}, 
            React.createElement("img", { src: "/logo.png", style: {width:30, height:30}, className: "mr-0 mr-md-2" } ),
            "Noisey"
          ),
          React.createElement(Reactstrap.Nav, {className: "mr-auto navbar-nav"}, 
            React.createElement(Reactstrap.NavItem, {className: "active"}, 
              React.createElement(Reactstrap.NavLink, {href: "#config"}, "Configuration")),
            React.createElement(Reactstrap.NavItem, {}, 
              React.createElement(Reactstrap.NavLink, {href: "#visu"}, "Visualisation"))
          )
        )
      ) ; 


      let chart = ReactDOMServer.renderToString(
        React.createElement(DeviceLayout, {id: "visu", className: "d-none"}, 
          React.createElement(Reactstrap.Col, {xs: 12, className: "h-75"},
            React.createElement('canvas', {id: "chart", style: {width: '100%', height: "80%"} } ) 
          )
        )
      ) ; 

      res.send("<html><head><link rel=\"stylesheet\" type=\"text/css\" href=\"../css/bootstrap.min.css\" /><script src=\"../js/jquery-3.2.1.min.js\"></script><script src=\"../js/popper.min.js\"></script><script src=\"../js/bootstrap.min.js\"></script><script src=\"../js/config.js\"></script><script src=\"../js/moment.min.js\"></script><script src=\"../js/Chart.min.js\"></script></head><body><div>" + navbar + container + chart + "</div></body></html>") ; 

    });
  });


  // Handle post message to date
  router.post('/date', (req, res, next) =>  
  {
    var dateServer = new Date(), dateClient = new Date(req.body.date) ; 
    
    // If the dates returned by the client and the server are more than one minute appart, update the server's date
    if ( ( dateClient.getTime() - dateServer.getTime() ) > 60 * 1000 )
    {
      exec('sudo date +"%Y-%m-%d %H:%M:%S" -s "'+ dateClient.getFullYear() + "-" + (dateClient.getMonth() + 1) + "-" + dateClient.getDate() + " " + dateClient.getHours() + ":" + dateClient.getMinutes() + ":" + dateClient.getSeconds() +'" ', (err, stdout, stderr) => 
      {
        var dateNow = new Date() ; 
        res.json( { dateClient: dateClient, oldDateServer: dateServer, newDateServer: dateNow } ) ; 
      });
    }
    else
    {
      res.json( { dateClient: dateClient, dateServer: dateServer } ) ; 
    }
  }) ;

  return router;
}
