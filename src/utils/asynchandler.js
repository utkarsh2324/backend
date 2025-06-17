const asynchandler=(requestHanlder)=>{ //method
   return (req,res,next)=>{
        Promise.resolve(requestHanlder(req,res,next)).catch((err)=>next(err))
    }
}
export {asynchandler}
//export default asynchandler 



//if you want to pass function
/*
const asynchandle=(fn)=>async (req,res,next)=>{
    try{
    await fu(req,res,next)
    }
    catch(error){
    res.status(err.code  || 500 ).json({
        success;flase,
        message:err.message 
    })
    }
    
    
    
    
    }
*/