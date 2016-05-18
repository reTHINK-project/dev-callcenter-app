/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter';
import hello from './hello';

class Receiver extends EventEmitter {
  /**
  * Create a new HelloWorldObserver
  * @param  {Syncher} syncher - Syncher provided from the runtime core
  */
  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super();

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/HelloWorldDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);


    let _this = this;
    this._syncher.onNotification(function(event) {
      _this._onNotification(event);
    });
  }


  _onNotification(event) {
      let _this = this;
      console.info( 'Event Received: ', event);
      this.trigger('invitation', event.identity);
      event.ack(); // Acknowledge reporter about the Invitation was received

      // Subscribe Hello World Object
      this._syncher.subscribe(this._objectDescURL, event.url)
      .then(function(helloObjtObserver) {

        // Hello World Object was subscribed
        console.info(helloObjtObserver);

        // lets notify the App the subscription was accepted with the most updated version of Hello World Object
        _this.trigger('slide', helloObjtObserver.data);

        helloObjtObserver.onChange('slider', function(event) {
          console.info('message received:', event); // Hello World Object was changed
          _this.trigger('slide', helloObjtObserver.data); // lets notify the App about the change
        });
      }).catch(function(reason) {
        console.error(reason);
      });

    }

    /**
    * Create the DataObject
    * @param  {HypertyURL} HypertyURL - Invited
    */
    connect(hypertyURL) {
      console.log("this is: ", this)
      let _this = this;
      let syncher = _this._syncher;

      return new Promise(function(resolve, reject) {
        syncher.create(_this._objectDescURL, [hypertyURL], hello)
        .then(function(helloObjtReporter) {
          console.info('1. Return Created Object', helloObjtReporter);
          _this.helloObjtReporter = helloObjtReporter;
          helloObjtReporter.onSubscription(function(event) {
            console.info('-------- Receiver received subscription request --------- \n');
            event.accept(); // All subscription requested are accepted
          });
          resolve(helloObjtReporter);
        })
        .catch(function(reason) {
          console.error(reason);
          reject(reason);
        });

      });
    }


    slideback(data) {
      console.log("[Receiver] [slideback] has been called");
      this.helloObjtReporter.data.slider = data;
      console.log("[Receiver] [slideback] helloObjtReporter: ", this.helloObjtReporter);
    }

}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Receiver',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}
