const DB = require('../../../../../shared-modules/mongodb-helper');

function QualInputsUtils() {

    async function getQualInputImpl(dd, mm, yy, deviceId) {
        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];

        let filter = { deviceId: deviceId, dd: dd, mm: mm, yy: yy };
        console.log(filter);
        let sort = { hh: 1 };

        let teCursor = db.collection("qualInput").aggregate([
            { "$match": filter },
            { "$sort": sort }
        ]);

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }
        return devArray;
    }

    async function postQualInputsImpl(dd,mm,yy,deviceId,data) {
        let db = await DB.Get();
        let responseObj = {};
        let filter = { deviceId: deviceId, dd: dd, mm: mm, yy: yy };

        await db.collection("qualInput").deleteMany(filter);

        await db.collection("qualInput").insertMany(data);
    }

    return {
        getQualInputs: getQualInputImpl,
        postQualInputs: postQualInputsImpl
    }
}

module.exports = QualInputsUtils();