dataobject = {
	connection : {
		name 		: '',
		status 		: "connected",
		owner 		: "hyperty://example.com/alicehy",
		peer 		: "connection://example.com/alice/bob27012016",
		ownerPeer : {
			connectionDescription: {
				sdp	: sessiondescription.sdp, // from local description
				type: sessiondescription.type
			},
			iceCandidates: []
		}
	},
	peer : {
		connectionDescription: {
			sdp	: sessiondescription.sdp,
			type: sessiondescription.type
		},
		iceCandidates: [],
		reporter : "hyperty://matrix2.rethink.com/matrixmn/f0708102-14ad-4845-bdb2-6d2ee4b805ed",
		schema : "hyperty-catalogue://matrix2.rethink.com/.well-known/dataschemas/FakeDataSchema"
	},
	data : {
		type : "offer/answer/candidate",
		sdp,
		candidate
	}
}