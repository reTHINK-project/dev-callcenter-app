/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter'; // for receiving
import hello from './hello';

class Sender extends EventEmitter{ // extends EventEmitter because we need to recieve events
  /**
  * Create a new HelloWorldReporter
  * @param  {Syncher} syncher - Syncher provided from the runtime core
  */
  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super(); // call event emitter constructor to be able to receive things

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/HelloWorldDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);;

    // receiving from here
    let _this = this;
    this._syncher.onNotification(function(event) {
      _this._onNotification(event);
    });
  }

  connect(hypertyURL) {
    let _this = this;
    let syncher = _this._syncher;

    return new Promise(function(resolve, reject) {
      syncher.create(_this._objectDescURL, [hypertyURL], hello)
      .then(function(helloObjtReporter) {
        console.info('1. Return Created Hello World Data Object Reporter', helloObjtReporter);
        _this.helloObjtReporter = helloObjtReporter;
        helloObjtReporter.onSubscription(function(event) {
          console.info('-------- Hello World Reporter received subscription request --------- \n');
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

  /**
  * Update HelloWorld Data Object
  *
  */

  slide(data) {
    console.log('[Sender] [slide]: ', this.helloObjtReporter );
    this.helloObjtReporter.data.slider = data;
  }

  // reveicing starts here

  _onNotification(event) {
      let _this = this;
      console.info( 'Event received on sender side: ', event);
      this.trigger('invitation', event.identity);
      event.ack(); // Acknowledge reporter about the Invitation was received
      
      // Subscribe Hello World Object
      this._syncher.subscribe(this._objectDescURL, event.url)
      .then(function(helloObjtObserver) {

        // Hello World Object was subscribed
        console.info(helloObjtObserver);

        // lets notify the App the subscription was accepted with the most updated version of Hello World Object
        _this.trigger('slideback', helloObjtObserver.data);

        helloObjtObserver.onChange('slider', function(event) {
          console.info('message received:',event); // Hello World Object was changed
          _this.trigger('slideback', helloObjtObserver.data); // lets notify the App about the change
        });
      }).catch(function(reason) {
        console.error(reason);
      });

    }


}



export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Sender',
    instance: new Sender(hypertyURL, bus, configuration)
  };

}
