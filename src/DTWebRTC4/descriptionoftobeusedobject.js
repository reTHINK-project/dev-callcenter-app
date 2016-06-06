dataobject = {
	connection : { // owner has that
		name 		: '',
		status 		: "connected",
		owner 		: "hyperty://example.com/alicehy",
		peer 		: "connection://example.com/alice/bob27012016",
		ownerPeer : {
			connectionDescription: {
				sdp	: sessiondescription.sdp, // from local description
				type: sessiondescription.type // "offer" / "answer"
			},
			iceCandidates: [
				{
					type         : "candidate",
					candidate    : event.candidate.candidate,
					sdpMid       : event.candidate.sdpMid,
		        	sdpMLineIndex: event.candidate.sdpMLineIndex
				},{
					...
				}
			]
		}
	},
	peer : {
		connectionDescription: {
			sdp	: sessiondescription.sdp,
			type: sessiondescription.type
		},
		iceCandidates: [
			{
				type         : "candidate",
				candidate    : event.candidate.candidate,
				sdpMid       : event.candidate.sdpMid,
	        	sdpMLineIndex: event.candidate.sdpMLineIndex
			},{
				...
			}
		],
		reporter : "hyperty://matrix2.rethink.com/matrixmn/f0708102-14ad-4845-bdb2-6d2ee4b805ed",
		schema : "hyperty-catalogue://matrix2.rethink.com/.well-known/dataschemas/FakeDataSchema"
	},
	data : {
		type : "offer/answer/candidate",
		sdp,
		candidate
	}
}

peerData.connectionDescription.type = offer