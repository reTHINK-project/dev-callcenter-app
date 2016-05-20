/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter';
import obj from './obj';

class Receiver extends EventEmitter {

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super();

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/FakeDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);

    // receiving starts here
    let _this = this;
    this._syncher.onNotification(function(event) {
      _this._onNotification(event);
    });
  }

  connect(hypertyURL) {
    let _this = this;
    let syncher = _this._syncher;

    return new Promise(function(resolve, reject) {
      syncher.create(_this._objectDescURL, [hypertyURL], obj)
      .then(function(objReporter) {
        console.info('1. Return Created Data Object Reporter', objReporter);
        _this.objReporter = objReporter;
        objReporter.onSubscription(function(event) {
          console.info('-------- Receiver received subscription request --------- \n');
          event.accept(); // All subscription requested are accepted
        });
        resolve(objReporter);
      })
      .catch(function(reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

  // send data to the other hyperty
  slideback(data) {
    this.objReporter.data.slider = data;
    console.log("[Receiver] [slideback] objReporter: ", this.objReporter);
  }

  // reveicing starts here
  _onNotification(event) {
    let _this = this;
    console.info( 'Event Received: ', event);
    this.trigger('invitation', event.identity);
    event.ack(); // Acknowledge reporter about the Invitation was received

    // Subscribe to Object
    this._syncher.subscribe(this._objectDescURL, event.url)
    .then(function(objObserver) {
      console.info(objObserver);

      // lets notify the App the subscription was accepted with the most updated version of Object
      _this.trigger('slide', objObserver.data);

      objObserver.onChange('slider', function(event) {
        console.info('message received:', event); // Object was changed
        _this.trigger('slide', objObserver.data); // lets notify the App about the change
      });
    }).catch(function(reason) {
      console.error(reason);
    });
  }
}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Receiver',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}
