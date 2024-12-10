<h6>ENUM </h6>
<p>
when enum of role is selected,

 if it is student then calculate graduation year, if graduation year is less than today then block the account, but if some days are left to graduate, mean today < graduation year then send notification to update primary email otherwise will block account after graduation. but if phone number is present then , relax the restriction , meaning don't block account just send notification. As later, it will be converted to alumni. if graduationDate < today Year

if role is alumni, then graduation year is selected from university email. but if university email is not  present. then no worries. alumni will be able to use it after mods approve it with their primary email, student card , phone number.  (for those who were never role:student in our platform. they are graduated from a university already)

if ext_org or teacher. it is not needed, graduation year is irrelevant for them
for ext_org whats needed is if approved and approved by whom
</p>



<h1>Things that cause issue in different universities and campus</h1>
<h3>Roll Number EMAIL</h3>
<h5>Graduation Year</h5>
<p>University email might have information about graduation or not. So for this, we will not calculate graduation year instead we will add it in from for user to add wehn registering</p>

<h2>Required</h2>
<h3>Must </h3>

<p>
Student : university email, 
Alumni :  primary email, phone number, student card
</p>

<h3>Moderate </h3>

<p>
Student :   primary email, phone number, 
Alumni  :   student card
</p>