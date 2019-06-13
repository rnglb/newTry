const DB = require('../../../../../shared-modules/mongodb-helper');

function RawEnergyUtil() {

    async function getRawEnergyImpl(fromTs,toTs,limit,attr,deviceId) {
        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];


        if (attr !== 'total' && attr !== 'delta' && attr !== 'appl' && attr !== 'hourly') {
            attra = '$' + attr + 'a';
            attrb = '$' + attr + 'b';
            attrc = '$' + attr + 'c';

            let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };
            let project = { _id: 0, ts: 1 }
            project["r"] = attra;
            project["y"] = attrb;
            project["b"] = attrc;
            let sort = { ts: 1 }

            console.log(filter);
            console.log(project);

            let teCursor = db.collection("rawenergy").aggregate([
                { "$match": filter },
                { "$project": project },
                { "$sort": sort },
                { "$limit": parseInt(limit) }

            ])

            // let devArray = [{ name: "r", items: [] }, { name: "y", items: [] }, { name: "b", items: [] }];

            let sumEnergy = 0;

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                // let obj1 = { x: teDoc.ts, y: teDoc.r }
                // let obj2 = { x: teDoc.ts, y: teDoc.y }
                // let obj3 = { x: teDoc.ts, y: teDoc.b }
                // devArray[0].items.push(obj1);
                // devArray[0].items.push(obj2);
                // devArray[0].items.push(obj3);
                devArray.push(teDoc);
            }
        }




        if (attr === 'appl') {

            let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, appEnergy: { $gte: 0 } };
            let project = { _id: 0, toTs: 1, applId: 1, appEnergy: 1 }
            let sort = { toTs: 1 }

            console.log(filter);
            console.log(project);

            let teCursor = db.collection("appenergy").aggregate([
                { "$match": filter },
                { "$project": project },
                { "$sort": sort },
                { "$group": { _id: "$applId", items: { $push: { x: "$toTs", y: "$appEnergy" } } } },
                { "$project": { _id: 0, name: "$_id", items: 1 } },
                { "$limit": parseInt(limit) }

            ])

            // let devArray = [{ name: "r", items: [] }, { name: "y", items: [] }, { name: "b", items: [] }];

            let sumEnergy = 0;

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                // let obj1 = { x: teDoc.ts, y: teDoc.r }
                // let obj2 = { x: teDoc.ts, y: teDoc.y }
                // let obj3 = { x: teDoc.ts, y: teDoc.b }
                // devArray[0].items.push(obj1);
                // devArray[0].items.push(obj2);
                // devArray[0].items.push(obj3);
                teDoc.name = appliance[teDoc.name] || teDoc.name
                devArray.push(teDoc);
            }
        }

        if (attr === 'total' || attr === "delta") {

            let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, totEnergy: { $gte: 0 } };
            let project = { _id: 0, toTs: 1, totEnergy: 1 }
            let sort = { toTs: 1 }

            console.log(filter);
            console.log(project);

            let teCursor = db.collection("totenergy").aggregate([
                { "$match": filter },
                { "$project": project },
                { "$sort": sort },
                { "$limit": parseInt(limit) }

            ])

            let sumEnergy = 0;

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                sumEnergy = sumEnergy + teDoc.totEnergy;
                teDoc.sumEnergy = sumEnergy;
                devArray.push(teDoc);
            }
        }

        if (attr === 'hourly') {

            let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, totEnergy: { $gte: 0 } };
            let project = {
                _id: 0, toTs: 1, totEnergy: 1, hh: {
                    "$add": [{ "$hour": { "$add": [new Date(0), "$toTs", 19800000] } }, 1]
                }
            };
            let sort = { toTs: 1 };
            let group = { _id: "$hh", totEnergy: { "$sum": "$totEnergy" } };
            let project1 = { _id: 0, hh: "$_id", totEnergy: 1 };

            let teCursor = db.collection("totenergy").aggregate([
                { "$match": filter },
                { "$project": project },
                { "$sort": sort },
                { "$group": group },
                { "$project": project1 },
                { "$limit": parseInt(limit) }
            ])

            let sumEnergy = 0;

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                devArray.push(teDoc);
            }
        }
        return devArray;
    }

    return {
        getRawEnergy:getRawEnergyImpl
    }
}

module.exports = RawEnergyUtil();