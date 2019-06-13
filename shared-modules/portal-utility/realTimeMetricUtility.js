const DB = require('../../shared-modules/mongodb-helper')
var moment = require('moment');

function RealTimeUtility() {

    async function getRealTimeMetricImpl(asset, assetShift, tenantId) {
        console.log('#### asset  -> ' + JSON.stringify(asset));
        if(assetShift)console.log('### shifts length -> ' + assetShift.length);
        let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
        let currmillisec = moment().utcOffset(5.5).valueOf();
        let todaymillisec = currmillisec - dayStartmilli;

        let temp = {}
        if (!asset.computed.NILM.shift) {
            console.log('### inside 1111')
            let factoryFilter = {
                tenantId: tenantId,
                _id: ObjectID(asset.factoryId)
            }
            let factoryDetails = await Factory.findOne(factoryFilter);

            if (!factoryDetails) {
                temp[asset.assetId] = {
                    "message": "Shift not found"
                }
            } else {
                let assetCompute = asset.computed;
                var d = new Date();
                let strtTs = moment().utcOffset(5.5).startOf('day').valueOf();
                let currTs = d.getTime() - strtTs;
                let today = d.getDay()

                //sunday to be accounted as 7 and not 0
                if (today === 0) {
                    today = 7

                    console.log("today : => " + today)
                }
                console.log(JSON.stringify(factoryDetails))


                if (factoryDetails) {
                    let shiftarray = factoryDetails.shift;
                    shiftarray.forEach((ele) => {
                        if (ele.days && ele.days.indexOf(today) > -1) {
                            let sftDtls = ele.shiftDetails;
                            sftDtls.forEach((detail) => {
                                if (currTs > detail.Timings.Fromts && currTs < detail.Timings.Tots) {
                                    assetCompute.NILM.shift = {};
                                    assetCompute.NILM.shift.name = detail.Name
                                    assetCompute.NILM.shift.startsftts = detail.Timings.Fromts
                                    assetCompute.NILM.shift.endsftts = detail.Timings.Tots
                                }
                            });
                        }
                    })
                }

                var keyParams = {
                    tenantId: tenantId,
                    assetId: asset.assetId
                }
                console.log(JSON.stringify(assetCompute))

                result = await Asset.update(keyParams, { $set: assetCompute });
                asset.computed = assetCompute;

                if (!asset.computed.NILM.shift) {
                    console.log("shift not found")
                    temp[asset.assetId] = {
                        "message": "Shift not found"
                    }

                }
            }

        }

        if (!temp[asset.assetId]) {

            let errorMsg = [];

            let startTs = asset.computed.NILM.shift.startsftts
            let endTs = asset.computed.NILM.shift.endsftts
            let elapsed = todaymillisec - startTs;
            let shiftperiod = endTs - startTs;
            // RTM Changes - add new variable
            let rtmPartCnt = 0, avail = 0, perf = 0, qual = 0, projcount = 0, partcnt = 0, energy = 0, activeMins = 0, shiftPlan = 0, shiftName = "No Shift", shiftFrmTs = 0, shiftToTs = 0;
            let rejectCnt = 0;
            let aId = asset.assetId;

            if (!asset.computed.NILM.shift.name) {
                errorMsg.push("No shift defined for " + asset.assetId);
                temp[aId] = {
                    "error": errorMsg,
                    "activeMins": 0,
                    "avail": 100,
                    "partcnt": 0,
                    "energy": 100,
                    "quality": 100,
                    "status": '',
                    "shiftplan": 0,
                    "shift": '',
                    "shiftfrmts": '',
                    "shifttots": '',
                    "performance": {
                        "projcount": 0,
                        "perf": 100
                    }
                }
            }
            else {
                
                let status = "off";

                if (asset.computed.NILM.availmins) {
                    let availts = asset.computed.NILM.availmins.value;
                    avail = ((availts / elapsed) * 100).toFixed(2);
                    if (avail < 0) {
                        avail = 0;
                    }
                    activeMins = availts / 60 / 1000;
                }
                if (asset.computed.NILM.shift) {
                    shiftName = asset.computed.NILM.shift.name;
                    shiftFrmTs = asset.computed.NILM.shift.startsftts;
                    shiftToTs = asset.computed.NILM.shift.endsftts;
                }

                if (asset.computed.NILM.partcnt) {

                    //RTM changes
                    
                    if(! (assetShift && assetShift.length>0)){
                        console.log('### No shift started ....');
                        rtmPartCnt = asset.rtmPartCount; // this will display count for ongoing shift or for previously closed shift
                   
                        if (rtmPartCnt < 0) {
                            rtmPartCnt = 0;
                        }
                        
                        let runrate = asset.runrate;

                        let crr = rtmPartCnt / (elapsed / 60 / 60 / 1000);
                        projcount = Math.round(crr * (shiftperiod / 60 / 60 / 1000));
                        if (projcount < 0) {
                            projcount = 0;
                        }
                        console.log('### elapsed -> ' + elapsed);
                        perf = ((60 / runrate) * (rtmPartCnt/(elapsed / 60 / 1000)) * 100).toFixed(2);
                        if (perf < 0) {
                            perf = 0;
                        }

                        qual = (((rtmPartCnt - rejectCnt) / rtmPartCnt) * 100).toFixed(2);
                        if (qual < 0) {
                            qual = 0;
                        }
                    }else{
                        // find open shift to get partcount and projection
                        // aggregate all reject count 
                        // if no open shift find last closed shift.

                        let foundOpenShift= false;
                        let perfArr = [];

                        for(var index = 0; index<assetShift.length  ; index++){
                            shift = assetShift[index];
                            if(index==0){
                                // display shift plan for open shift or last closed shift but ongoing
                                
                                shiftPlan = shift.shiftPlan;

                                rtmPartCnt = asset.rtmPartCount;
                                elapsed = (currmillisec - shift.fromTs);

                                let rtmRate = rtmPartCnt / (elapsed);
                                projcount = Math.round(rtmRate * (shift.toTs - shift.fromTs));

                                // performance for open shift
                                let shiftRunrate = shift.runrate ? shift.runrate : asset.runrate;
                                let shiftPerf = (60 / shiftRunrate) * (rtmPartCnt) / elapsed;
                                shiftPerf = shiftPerf * 60 * 1000;
                                console.log('### 0 per -> ' + shiftPerf);
                                perfArr.push(shiftPerf);

                            }else{
                               
                                // performance for closed shift 
                                
                                let shiftRunrate = shift.runrate ? shift.runrate : asset.runrate;
console.log(shiftRunrate)
                                elapsed = shift.toTs - shift.fromTs;
console.log(elapsed)
console.log(shift.shiftPartCount)
if(shiftRunrate > 0 && shift.shiftPartCount && elapsed ){
                                let shiftPerf = (60 / shiftRunrate) * (shift.shiftPartCount) / elapsed;
                                shiftPerf = shiftPerf * 60 * 1000;
                                console.log('### 1 per -> ' + shiftPerf);
                                perfArr.push(shiftPerf);
}
                               
                            }
                            rejectCnt = rejectCnt + shift.rejectCount.startup + shift.rejectCount.production;
                        }

                        let avgPerf = 0;
                        if (perfArr.length > 0) {
                            perfArr.forEach((val) => {
                                avgPerf = avgPerf + val / perfArr.length;
                            })

                            perf = (avgPerf * 100).toFixed(2);
                        }
                        if (perf < 0) {
                            perf = 0;
                        }
                        
                        console.log('###  rejectCnt  ' + rejectCnt);
                        qual = (((asset.computed.NILM.partcnt.value - rejectCnt) / asset.computed.NILM.partcnt.value) * 100).toFixed(2);
                        if (qual < 0) {
                            qual = 0;
                        }
                    }

                    
                }
                if (asset.computed.NILM.energy) {
                    energy = asset.computed.NILM.energy.value;
                    if (energy < 0) {
                        energy = 0;
                    }
                }
                if (asset.computed.NILM.deviceStatus) {
                    status = asset.computed.NILM.deviceStatus.value;
                }

                temp[aId] = {
                    "activeMins": activeMins,
                    "avail": avail,
                    "partcnt": rtmPartCnt,
                    "energy": energy,
                    "quality": qual,
                    "status": status,
                    "shiftplan": shiftPlan,
                    "shift": shiftName,
                    "shiftfrmts": shiftFrmTs,
                    "shifttots": shiftToTs,
                    "performance": {
                        "projcount": projcount,
                        "perf": perf
                    }
                }
                console.log('#### -> ' + JSON.stringify(temp));
            }
            
            //rtArray.push(temp);
        }
        return temp;
    }
    return {
        getRealTimeMetric: getRealTimeMetricImpl
    }
}
module.exports = RealTimeUtility();