const https=require('https');
const SB='quzjixxqowxbezbcmqws.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1emppeHhxb3d4YmV6YmNtcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYwMTcsImV4cCI6MjA5MzQ5MjAxN30.cp_eoG5fAbead2rOdVbsHjNo5hLFMRvkFS9OvL5rcyk';

function fetchCount(path){
  return new Promise((res,rej)=>{
    const opts={hostname:SB,path:'/rest/v1/'+path,headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Prefer':'count=exact','Range':'0-0'}};
    https.get(opts,r=>{
      let body='';
      r.on('data',d=>body+=d);
      r.on('end',()=>{
        const cr=r.headers['content-range'];
        console.log('Path:',path.slice(0,80));
        console.log('Status:',r.statusCode,'Content-Range:',cr,'Body:',body.slice(0,100));
        res(cr);
      });
    }).on('error',rej);
  });
}

async function main(){
  // No filters at all
  await fetchCount('financial_reservations?select=id');
  // Status filter only
  await fetchCount('financial_reservations?select=id&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)');
  // booking_date range  
  await fetchCount('financial_reservations?select=id&booking_date=gte.2024-01-01&booking_date=lte.2027-12-31');
  // arrival_date range (what OLD version used for 591)
  await fetchCount('financial_reservations?select=id&arrival_date=gte.2026-01-01&arrival_date=lte.2026-12-31');
  // All statuses + all dates
  await fetchCount('financial_reservations?select=id&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved,cancelled,closed,declined,expired)');
}
main().catch(console.error);
