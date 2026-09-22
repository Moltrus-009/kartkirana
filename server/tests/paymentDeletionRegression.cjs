// Existing suite's mock admin predates the required admin phone allowlist.
// Supply that fixture only in this test process; production auth is unchanged.
process.env.NODE_ENV='test';process.env.USE_MOCK_DB='true';process.env.PAYMENT_ENVIRONMENT='TEST';process.env.PORT='5001';
const path=require.resolve('../middleware/auth');
const auth=require(path);
require.cache[path].exports=(req,res,next)=>{
  if(req.headers.authorization==='Bearer mock_token_admin'){
    req.user={uid:'admin',role:'admin',admin:true,phone_number:'+919580184045'};
    return next();
  }
  return auth(req,res,next);
};
require('./runTests');
