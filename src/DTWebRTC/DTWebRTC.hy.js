/* jshint undef: true */
import Syncher 		from 'service-framework/dist/Syncher';
import divideURL 	from '../utils/utils';
import EventEmitter from '../utils/EventEmitter'; // for receiving
import connection	from './connection';

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
}
