define(['crypho/husher', 'sjcl'], function (husher, sjcl) {

    husher.sweatshop.registerWorker('sjcl', 'sjcl.worker.js');

    describe('Husher Crypto helper', function () {
        var h;

        beforeAll(function(done){
            h = new husher.Husher();
            h.generate('secret', 'foo@bar.com').done(function(){done();});
        });

        it('generates elGamal public/private keys of the NIST 384 family when calling _generateKeyPair()', function () {
            var kp = husher._generateKeyPair();
            expect(kp.pub instanceof sjcl.ecc.elGamal.publicKey).toBeTruthy();
            expect(kp.sec instanceof sjcl.ecc.elGamal.secretKey).toBeTruthy();
            expect(kp.pub._curve).toEqual(sjcl.ecc.curves.c384);
            expect(kp.sec._curve).toEqual(sjcl.ecc.curves.c384);
        });

        it('strengthens a key with scrypt when calling _strengthenScrypt()', function (done) {
            husher._strengthenScrypt('secret')
            .done(function (res) {
                expect(res.key.length).toEqual(8); // 8 words = 256 bit
                expect(res.key2.length).toEqual(8); // 8 words = 256 bit
                expect(res.salt.length).toEqual(2); // 2 words = 64 bit
                done();
            });
        });

        it('generates random 256 bit keys suitable for AES encryption', function () {
            var key = husher.randomKey();
            var bits = sjcl.codec.base64.toBits(key);
            expect(bits.length).toEqual(8);
        });

        it('generates elGamal public/private keys of the NIST 384 family when calling generate()', function () {
            expect(h.encryptionKey.pub instanceof sjcl.ecc.elGamal.publicKey).toBeTruthy();
            expect(h.encryptionKey.sec instanceof sjcl.ecc.elGamal.secretKey).toBeTruthy();
            expect(h.signingKey.pub instanceof sjcl.ecc.ecdsa.publicKey).toBeTruthy();
            expect(h.signingKey.sec instanceof sjcl.ecc.ecdsa.secretKey).toBeTruthy();
            expect(h.encryptionKey.pub._curve).toEqual(sjcl.ecc.curves.c384);
            expect(h.encryptionKey.sec._curve).toEqual(sjcl.ecc.curves.c384);
        });

        it('generates a 256 bit AES from the provided passphrase using scrypt when calling generate()', function (done) {
            expect(h.macKey.length).toEqual(8); // 8 words = 256 bit
            expect(h.authKey.length).toEqual(8); // 8 words = 256 bit
            expect(h.scryptSalt.length).toEqual(2); // 2 words = 64 bit

            // The scrypt salt should be generated from the email address
            expect(h.scryptSalt).toEqual(husher._hash('foo@bar.com-crypho.com').slice(0,2));

            husher._strengthenScrypt('secret', {salt: h.scryptSalt})
            .done(function (res) {
                expect(res.key).toEqual(h.macKey);
                expect(res.key2).toEqual(h.authKey);
                expect(sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(res.key2))).toEqual(h.authHash());
                done();
            });
        });

        it('can encrypt/decrypt using elGamal Public-Private cryptosystem', function () {
            var ct = h.encrypt('foo');
            expect(h.decrypt(ct)).toEqual('foo');
        });

        it('can encrypt/decrypt using AES symmetric cryptosystem in CCM mode', function () {
            var ct = h.encrypt('foo', 's3cr1t', 'auth_data');
            expect(h.decrypt(ct, 's3cr1t')).toEqual('foo');
        });

        it('will not encrypt using AES in CCM mode without auth data', function () {
            expect(function () { h.encrypt('foo', 's3cr1t'); }).toThrow(new Error('Only authenticated CCM supported'));
        });

        it('can use progressive OCB2 to encrypt/decrypt binary files', function (done) {
            var key = husher.randomKey();
            var b64 = 'iVBORw0KGgoAAAANSUhEUgAAAicAAAERCAYAAACgmwfwAAAWdWlDQ1BJQ0MgUHJvZmlsZQAAWIWVmAVcFN+3wO9ssssutXQvsXR3d3eHCCxLd5cBoqKCUlISChiIKCAlgkoYINJIKKKEiCgqBoKg8lZ/T3z///u89z7vfj4z9ztn7pw5M+eeOfcMAOx95MjIUBgDAGHhsdH2Jvr8rm7u/OgXAAuQgAbQAwkyJSZSz9bWElDbn/5f29dJAP3qx6V+6frv5//XxujrF0MBALKlso9vDCWMys3UbYASGR0LADyVKhdMiI38xReozBxNNZDKbb844B8e+MU+//Dc7zGO9gZU/gIADY5Mjg4AAPfrXvzxlACqHhw/ACimcN+gcACYFKmsTQkk+wLATj0HJMPCIn5xBZVFff6LnoB/0emzq5NMDtjlf57ld6MxDIqJDCUn/T9fx//dwkLj/txDgLrhAqNN7am9EPWdXQ6JsNjlcB9rmz8c5Pt7/G8OjDN1+sOUGAP3P+xLNrT4w3EhTnp/mBz999qgWDPHPxwdYb+rPzzU2nJXv5/ZLvvFGDn8Yf8gY7M/nBzo6PKH44Ocrf9wTIiDxd8xBrvy6Dj7XZv9o413nzEs5q9tFPLfe8UGOpr+tcF11x5fP0OjXXm40+74yFj9XZ2RobZ/7Q812ZXHxDvsXhtLnWB/OJhsbvtXj+3u+wGWwAgYAn5gAIJAOPADYYBMPTKkHsWASBBKPUqK9Uv8NeeAQURkUnRQQGAsvx41gvz4zcIp0pL88rJySgD8isd/3P3Z/necQazDf2VR1OvV1QCAlf+VkSUAaJekhsHVvzIhZQBoSwHoWKTERcf/I0P82iGpkU4PmAEH4AWCQBRIAXmgDDSALtV6c2ADHIEb8AQUEEi1PxokgP3gEEgHmSAHFIAScA6cB5fBNdAIboBboBs8AI/ACJgAM2AOLIG3YA18BdsQBKEhPESAOCA+SBiSgOQhVUgbMoIsIXvIDfKGAqBwKA7aDx2GMqE8qASqhGqg69BNqBt6CI1CT6B5aAX6BG3B4DAcjBnGAyPBZGCqMD2YBcwRthcWAIuCJcOOwLJgxbAq2FVYK6wb9gg2AZuDvYWtwwGcFs4KJ8Kl4KpwA7gN3B3uD4+GH4RnwAvhVfA6eDu8Fz4On4Ovwr8hUAgCgh8hhdBAmCKcEBREFOIg4iSiBHEZ0Yq4hxhHzCPWED+ReCQ3UgKpjjRDuiIDkAnIdGQh8hKyBXkfOYFcQn5FoVCsKBGUCsoU5YYKRu1DnUSVo+pRXahR1CJqHY1Gc6Al0FpoGzQZHYtOR59BX0V3osfQS+hNGloaPhp5GmMad5pwmjSaQporNHdoxmiWabYxDBhhjDrGBuOLScJkYy5g2jHDmCXMNpYRK4LVwjpig7GHsMXYOux97DPsZ1paWgFaNVo72iDaVNpi2gbaPtp52m84Jpw4zgDngYvDZeGqcV24J7jPeDyehNfFu+Nj8Vn4Gvxd/HP8Jh2BTprOjM6XLoWulK6VbozuPT2GXphej96TPpm+kL6Jfph+lQHDQGIwYCAzHGQoZbjJMMWwzkhglGO0YQxjPMl4hfEh42smNBOJyYjJl+kI03mmu0yLBDhBkGBAoBAOEy4Q7hOWmFHMIsxmzMHMmczXmIeY11iYWBRZnFkSWUpZbrPMscJZSaxmrKGs2ayNrJOsW2w8bHpsfmwn2OrYxtg22LnYddn92DPY69kn2Lc4+DmMOEI4cjlucMxyIjjFOe04EzjPct7nXOVi5tLgonBlcDVyPeWGcYtz23Pv4z7PPcC9zsPLY8ITyXOG5y7PKi8rry5vMG8+7x3eFT4CnzZfEF8+XyffG34Wfj3+UP5i/nv8a0RuoikxjlhJHCJuC4gIOAmkCdQLzApiBVUF/QXzBXsE14T4hKyE9gvVCj0VxgirCgcKFwn3Cm+QREgupGOkG6TXIuwiZiLJIrUiz0TxojqiUaJVoo/FUGKqYiFi5WIj4jBxJfFA8VLxYQmYhLJEkES5xKgkUlJNMlyySnJKCielJxUvVSs1L80qbSmdJn1D+r2MkIy7TK5Mr8xPWSXZUNkLsjNyTHLmcmly7XKf5MXlKfKl8o8V8ArGCikKbQofFSUU/RTPKk4rEZSslI4p9Sj9UFZRjlauU15REVLxVilTmVJlVrVVPanap4ZU01dLUbul9k1dWT1WvVH9g4aURojGFY3XmiKafpoXNBe1BLTIWpVac9r82t7aFdpzOkQdsk6VzoKuoK6v7iXdZT0xvWC9q3rv9WX1o/Vb9DcM1A0OGHQZwg1NDDMMh4yYjJyMSoyeGwsYBxjXGq+ZKJnsM+kyRZpamOaaTpnxmFHMaszWzFXMD5jfs8BZOFiUWCxYiltGW7ZbwazMrU5bPbMWtg63vmEDbMxsTtvM2orYRtl22KHsbO1K7V7Zy9nvt+91IDh4OVxx+Oqo75jtOOMk6hTn1ONM7+zhXOO84WLokucy5yrjesD1kRunW5Bbmzva3dn9kvv6HqM9BXuWPJQ80j0m94rsTdz70JPTM9Tzthe9F9mryRvp7eJ9xfs72YZcRV73MfMp81mjGFCKKG99dX3zfVf8tPzy/Jb9tfzz/F8HaAWcDlgJ1AksDFwNMggqCfoYbBp8LngjxCakOmQn1CW0PowmzDvsZjhTeEj4vQjeiMSI0UiJyPTIuSj1qIKotWiL6EsxUMzemLZYZurCZyBONO5o3Hy8dnxp/GaCc0JTImNieOJAknjSiaTlZOPki/sQ+yj7evYT9x/aP39A70DlQeigz8GeFMGUIylLqSaplw9hD4UcGkyTTctL+3LY5XD7EZ4jqUcWj5ocrU2nS49OnzqmcezcccTxoONDJxROnDnxM8M3oz9TNrMw8/tJysn+U3Knik/tZPlnDWUrZ5/NQeWE50zm6uRezmPMS85bPG11ujWfPz8j/0uBV8HDQsXCc0XYoriiuWLL4rYzQmdyznwvCSyZKNUvrS/jLjtRtlHuWz52Vvds3Tmec5nntiqCKqYrTSpbq0hVhedR5+PPv7rgfKH3ourFmkuclzIv/agOr567bH/5Xo1KTc0V7ivZtbDauNqVqx5XR64ZXmurk6qrrGetz2wADXENb657X59stGjsaVJtqmsWbi5rIbRktEKtSa1rNwJvzLW5tY3eNL/Z067R3tIh3VF9i3ir9DbL7ew72DtH7ux0Jneud0V2rXYHdC/2ePXM3HW9+/ie3b2h+xb3+x4YP7jbq9fb2afVd+uh+sOb/ar9Nx4pP2odUBpoGVQabBlSHmodVhluG1EbaR/VHL0zpjPWPW44/uCx2eNHE9YTo5NOk9NTHlNz077Tr5+EPvn4NP7p9kzqM+SzjFmG2cLn3M+rXoi9qJ9Tnrs9bzg/sOCwMLNIWXz7Mubl96Ujr/CvCpf5lmtey7++tWK8MvJmz5ult5Fvt1fT3zG+K3sv+r75g+6HgTXXtaWP0R93Pp38zPG5+ovil5512/XnX8O+bm9kbHJsXv6m+q13y2VreTvhO/p78Q+xH+0/LX4+2wnb2YkkR5N/LwXg1A3m7w/Ap2oA8G4AEEYAwNL9s17+zwanLj5g1N4ZkobewsrhnggxJBr5EbWCnqJ5gZnHbuCQeBKdBX0sQwXjFIGWWZslmbWebZlDnJPMVcQ9zIvkU+L3I2YJNAqOCb0nwUToROnFaKlfvm8S7yTnpcal78q0yF6Qy5E/oBCs6KykqyyuQlD5rrqkNqDerFGmeVgrWNteR1tXUo9Pn9WAwRBjhDD6Ybxhsmb62mzOfNpiyPK+1S3rJptrtlfsauyvOFxzrHe67tzk0uTa7Nbs3rSn0eP63nrPeq9G7zZyt88A5YnvK78v/juBtEGswQIhEqFKYTrhZhFOkX5RCdGnYi7FdsZNx39MxCTxJ6vss95POZB4MCOlKLXiUGXaucPFR7KPpqfvOxZ13P+Ee4Z1pt5JpVOiWdzZTDm0uZg82tMM+ewFxEKJIsVirTNGJValTmV7yilnQ87FVqRW5lRVnm+50H/xxaUvl2lquK/I1OpfdboWUJdYf7yh8HpVY21TU3N7S2fr/RsP2wZvjrZPdEzfmrn94s7Lzrdd6z3wuyz3RO9rPrDtpfQlPMzoL3tUP9A9ODo0N/xuZH10a+z7+PbjzYn1yY9T76izbfHp85npZ2Ozg8/7XtyfezDfvzC2OPtyZWl9GXqNW2F/I/hWelXtncF7sw8Wa4Yf5T+xffr0uffLmfWQr5obdBsvNuu/pW7ZbRO3P37v/pH703tHdmfnX/wvjeRHfqb6/w3NAuYjLRYnjDeiC6TPZuhh/EyQYvZiOcP6mB3PYcV5lKuL+yuvBJ8X/0lis8Ck4BdhehK3CEmUKMYuTiu+KbEgOSTVLn1e5qRsvJy3vJmCrCKb4g+ll8r9KvWq+WrJ6p4a+pokLRqtt9qjOm265/Vy9dMMEgxDjXyMnU0sTLXN5MwFLVgs0ZabVm+sn9mM2vbZ9djfcehwbHNqcW5wqXW95FbpXrIn3+PU3mOeaV4p3inkNJ8MymnfMr9q/4aAtsCuoL7g4ZCJ0GdhL8NXIzajUNFsMZKx+nGu8eEJhxOLkq4md+4b2//ywHoKLBV7iC4Ndxh1+OeRL0dX0mePjR6/f6Itozbz7MmcU2lZCdlhOQG5AXnBp6PzkwsOF2YWnS4uPVNVUlPaUNZSfutsz7lHFZOVL6vWL6Ausl8Sr9a8bF3jdSWyNvVqzrWKuvr62w391ycaXzS9bl5r2WzdaUPdxLczd3De4r9NuiPZqdCl1W3e43Y39F7K/dMPqnvb+wYfzvV/GkAMsg6RhpVG9EctxxzGXR67T3hMek55TXs/8X5KniE/I8+Sn5NfUOYC5yMX9i9mvCxZqn3VsTzwenbl3Zvvq7h3nO9JH6TXZD6KUGfAzuf5L93rFV8Pbnhsqn9j//Z1a3y74fupH8E/jXcE/83//3P8DxGwzJosMdT4/0CNfwpXKfdjXjyfJn8IsUjgjuCC0E8SowhRVFxMTFxEgijJKcUgjZEBMp9ll+Wm5fsUWhUvKRUoH1aJUt2rZqGuoiGoSae5qbWoPaLTpdukd1m/wqDUsMAoy/iYSappolmkeYCFp6WjlZm1to2yrYydmD3JQchRwInozOfC7crhxurOtAfngd4L7f3h+c1rw3uTvE2B+dL40fuzBnAHEoNIweIhMqHyYUrhahE6kSZRdtFeMZGxqXG58ZUJ1xO7koaTZ/e93b95EJaCTcUdwqRB1Cz68sjjoz3p9cfKj2eciMsgZ1qdVD0lmEWf9SP7Xc5C7rO86dNT+dMFTwqni6aLp85MljwuHS8bLR8+O3huqGK0crJqlprp1i5uVSMu42tYrvDWkq5KX1OsU6/XaTC4btho1GTYrN+i26p1Q71N5aZCu0yHxC3SbYE7vJ1cXVzdvD1Cd6XuqdzXf2DV69Ln8zC0P/5RysDxwdyh4uGzI5WjVWMV42WPiyZyJzOnjkwfeJLwNGIm8Jn3rNtzhxe2c3bzLgs+i1Ev05YKXl1e7ng9uDL35tMq4h3ze6EP8mtaHw0/GX82/mKwrvNVY0N5U+6bxBZpm/87xw/CT/wO6pf///lv8quhqDXlBWqecDoGgGUuAGc1ACBhAcDRAWCLB8BRDcD0swFMQQHAZM/v5g+IWnhiAANgB0QgAVSo9bEd8AIRIIVaU1aBFvAQzILPEBYiQuqQIxQBZUDV0ANoCYaCicIsqbVeMbW+W4VzwE3hyfB6+GuEELVSu4B4jZSm1mI9KHqUN6oJTYP2RnfQsNMk0jzF6GCqqXXSQew7Wi/aUZwh7gZeHH+WjoXuFD0N/VEGJMMxRhzjaSYephqCCqGX2YV5mSWJlZa1gk2FbYQ9lAPLUctpzfmFq4zbhPszTwWvFe8WXzW/ExFJbBUIFiQKPhUqELYnEUgTIiWi3mIiYu/EmySSJHWkUFLD0qUygbKqcrRyL+RbFXIUQ5UsleVVeFUJanTqDBpsmkQtGW0dHQfdYL0j+pUG3YaLxmgTcVMLsyDzoxYVlh1W09Ybthx2WvZ+DtmOHU5vqXPZxi3NvXnP0l5WT2OvBO9a8hyFw9fBL9d/NJAQ5BpcEbIaphGeFbEcZRRdHYuPS4h/meiY1LtPa3/rQfmUhkNyaY1HFI5ePyZ1/FIGb2bxKUJWbg5jbv5pzvyqQqmijjNWJYtlKWcFz41UHj2vdxF+6eHlvCteV2Xr4PVPrzc35bZE3bC7KdtBe2vhTktXeo/rPckHsN6Zh62PCgbjh91H9cdlJ0Sn5J84zRTPbs/FL3xfOvaa7c3Vd8YfXn46ti6z8Wwr64fh7+/HH/+z/fa/MtX/tsAThIEDIAtUgCbwAMyANQgN8UIqkC0UAqVD56FuaA4GwQRhxrAQWB6sA/YKToDrw+PgV+AvEUQEGXERsYpURKYgB1E8qAjUPTQ3Oh49Tq2l82m+Ybwx/VgV7CVaDtpTODguGfcRH4Sfp9tDN0XvTD/FsIdhgTGEcYPpKIGVUMOszTzOEsSyw1rEJsc2SPU+HUcjpysXjKuO24MHz9PJG80nzDfNn0HUIn4SuCxIFuIRmhEuJXmKCIm8FW0RSxW3lGCTWJSsk0qSNpZhllmSbZPLkvdT0FXkVtxWmlW+S81nlWol6qUaVZp1Wrep37NXujv6XAbqhh5Gh4xrTEZNv5nzWuhYelkdsC63uWO7YI9xkHf0dDrlfMfls5uYu8+eUo9xT6yXnnci+brPW19RvwD/moB3QYrBB0P6wzjCQyK6ojii42Om4jTjLyTSJx1Ifr+ffGA6xS51MM3y8OBR2/Sx4/YnRjOtT/ZnmWb35prlDeU7FTwvCineKjlZRizvOOdW8bOq9oLnJbbqxzUFte7XiHWrDTcbM5o9WxXb8DeXOzpv53f6dSveBfcGH5T1hfXrDrANrg0PjNaOZ03ETwU8CZhJnq1+8XZB72XVMnYl7u3Se/e1sc826yObzlsvfoT9i///5/h//jv+BX7Hf/jv+L9PjX8kTARmAYuEFcE6YW/grHAjeAK8Fr6A4EG4I0oQz5BEZACyAfkdZY4qRX1AG6HL0Zs0TjQtGDbMfswi1grbTitKW4yjoc6AVbwX/jGdJd0Den36bgZ9hgeMlowTTGSmD4SDzHTMFSzyLA9YPVi/sGWzS7IPcIRzEjg7uPy4mbi7eCJ5+XlH+A7xy/O/IpYKOAjSCT4SyhS2IjGSnohUiYaJqYkjxUclyiWDpFSk0dJPZOpkj8p5yqsrcChsKT5X6lVuUalVvaxWp96hMaA5r7Wlw6qrpOeqf9Cg2nDcGG6iYEoxyzFvt1iwwljL2bjbHrO7Yb/iyOvk4pznMuLG4O6wp9Bj2pPTa493Gfk5RdA32K85AAq0DaoK3gi1CauNwEaGRU3E6Mc2xoskVCRxJ5fu5z5QlSKe2pJmcPjx0cD078dzMoiZDae0sh7mOOe+Op1YgCu8UKx9ZqZ0Xznv2XsVEVV85ycvFlS71whfWb/aV3euIanRpVmllasNdnO1Y+p2d2d1d/pdr/tyvVDfSH/FQPSQyQjf6LfxyYnWqZInh2bCZ31eeM0HLCYtnV5uWpleBe8l1tw/nfzS83X7m8p2/I+bv/wf468g/zt9QDh9AJDPd3Y+kwBA5wHwI3dnZ7tqZ+fHeWqx8QyArtB//sX/zjUMAOSRYP4Kgn0ZGqn//k/8PwD0hF6Ku8weOwAAAZ1pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+NTUxPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjI3MzwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoNY5XlAAAtKklEQVR4Ae3dCZgUxfnH8QrCHxQjEhQRUCOiqEnQEFQwiEQFr8eDRMGIgIIa0IAo4C3GK17Bgygmjxeg8eAQRYgPhwcQBcQYCYdixAsMIgoIgiLC/PvXj2vWhd3t6amaqe7+1vPso+xOV1d/qnf2neqqt35gjMkFXxQEEEAAAQQQQMALgRpetIJGIIAAAggggAAC3woQnHArIIAAAggggIBXAgQnXnUHjUEAAQQQQAABghPuAQQQQAABBBDwSoDgxKvuoDEIIIAAAgggQHDCPYAAAggggAACXgkQnHjVHTQGAQQQQAABBAhOuAcQQAABBBBAwCsBghOvuoPGIIAAAggggADBCfcAAggggAACCHglQHDiVXfQGAQQQAABBBAgOOEeQAABBBBAAAGvBAhOvOoOGoMAAggggAACBCfcAwgggAACCCDglQDBiVfdQWMQQAABBBBAgOCEewABBBBAAAEEvBIgOPGqO2gMAggggAACCBCccA8ggAACCCCAgFcCBCdedQeNQQABBBBAAAGCE+4BBBBAAAEEEPBKgODEq+6gMQgggAACCCBAcMI9gAACCCCAAAJeCRCceNUdNAYBBBBAAAEECE64BxBAAAEEEEDAKwGCE6+6g8YggAACCCCAAMEJ9wACCCCAAAIIeCVAcOJVd9AYBBBAAAEEECA44R5AAAEEEEAAAa8ECE686g4agwACCCCAAAIEJ9wDCCCAAAIIIOCVAMGJV91BYxBAAAEEEECA4IR7AAEEEEAAAQS8EiA48ao7aAwCCCCAAAIIEJxwDyCAAAIIIICAVwIEJ151B41BAAEEEEAAAYIT7gEEEEAAAQQQ8EqA4MSr7qAxCCCAAAIIIEBwwj2AAAIIIIAAAl4JEJx41R00BgEEEEAAAQQITrgHEEAAAQQQQMArAYITr7qDxiCAAAIIIIAAwQn3AAIIIIAAAgh4JUBw4lV30BgEEEAAAQQQIDjhHkAAAQQQQAABrwQITrzqDhqDAAIIIIAAAgQn3AMIIIAAAggg4JUAwYlX3UFjEEAAAQQQQIDghHsAAQQQQAABBLwSIDjxqjtoDAIIIIAAAggQnHAPIIAAAggggIBXAgQnXnUHjUEAAQQQQAABghPuAQQQQAABBBDwSoDgxKvuoDEIIIAAAgggQHDCPYAAAggggAACXgkQnHjVHTQGAQQQQAABBAhOuAcQQAABBBBAwCsBghOvuoPGIIAAAggggADBCfcAAggggAACCHglQHDiVXfQGAQQQAABBBAgOOEeQAABBBBAAAGvBAhOvOoOGoMAAggggAACBCfcAwgggAACCCDglQDBiVfdQWMQQAABBBBAgOCEewABBBBAAAEEvBIgOPGqO2gMAggggAACCBCccA8ggAACCCCAgFcCBCdedQeNQQABBBBAAAGCE+4BBBBAAAEEEPBKgODEq+6gMQgggAACCCBAcMI9gAACCCCAAAJeCRCceNUdNAYBBBBAAAEECE64BxBAAAEEEEDAKwGCE6+6g8YggAACCCCAAMEJ9wACCCCAAAIIeCVAcOJVd9AYBBBAAAEEECA44R5AAAEEEEAAAa8ECE686g4agwACCCCAAAIEJ9wDCCCAAAIIIOCVAMGJV91BYxBAAAEEEECA4IR7AAEEEEAAAQS8EiA48ao7aAwCCCCAAAIIEJxwDyCAAAIIIICAVwIEJ151B41BAAEEEEAAAYIT7gEEEEAAAQQQ8EqA4MSr7qAxCCCAAAIIIEBwwj2AAAIIIIAAAl4JEJx41R00BgEEEEAAAQQITrgHEEAAAQQQQMArAYITr7qDxiCAAAIIIIAAwQn3AAIIIIAAAgh4JUBw4lV30BgEEEAAAQQQIDjhHkAAAQQQQAABrwQITrzqDhqDAAIIIIAAAgQn3AMIIIAAAggg4JUAwYlX3UFjEEAAAQQQQKAmBAgggAACCCBQvUCrVq1M8+bNTb169UzdunW/d8D69evNunXrwq+lS5eaf//739/7Of/IT4DgJD8vXo0AAgggkHKB/v37m8MOO8y0aNHC7LbbbmbnnXcOg5Ef/OAHka/8m2++MQpY1qxZYz766COzaNEi8+qrr5r7778/ch1ZfqGkc1kGyPK1n3jiiWbs2LEmn184F176JdbXpk2bzMaNG8NPHmvXrjWffPKJ+eCDD8JPII8//nj4fRfnp053Aj/84Q/NG2+8YZo0aeLuJNXUXHZ/5XI58/XXX5sNGzaY1atXm5UrV5r//Oc/3t1fMlu4cKFp2LBhNVdW/Y91zeedd5559NFHq39xHq+w2a81atQI2zhy5Mg8WmD3pf369TMnn3yy+elPfxoGIy7fE3U/KlhRoKL3tfHjx9u9mBTVpuCErwwaBMFJLvhFCd6/klE+++yz3Ny5c3P33HNPrk2bNtyzCbhngz9iuVWrViXiBtP9NWfOnNzQoUNzhxxySMnuL5tmW7Zsyf3+97+3fi1JaGN1f9c6duyYmzp1ai4IVkt6fwYfwnIPPvig9T6q7voT8HMCkwR0kpMbN2nBScV3kBUrVuSCTx25k046yYlPVu8Lm9etP2L6o5/EUnZ/FTsQtmmm4KRv377Wfz+S0MbK7uPOnTvn5s+f790t+dVXX+WCkRTrfVWZg+/fZ7VO0EOUZApo2PvUU081EyZMMEuWLDGXXnppMi+EVnspUHZ/zZo1K3zM0rNnTy/bSaOiCQQBlQlGxsxTTz0VPr6JdlTxXlW7dm1zxhlnhPNUrr/++uKd2NMzEZx42jE0Kz+BZs2amVtvvdW8++67pkuXLvkdzKsRqEbgwAMPNCNGjAiDlCOOOKKaV/Nj3wSCR8HhPKNDDz3Ut6Zt1Z4ddtjBXHPNNWbevHmmadOmW/08K98gOMlKT2fkOvfee2/z5JNPmueffz4jV8xlFlNAQcr06dPDiYzFPC/niieg0RKtkrnwwgvNdtttF6+SEh3VsmVL89Zbb5kzzzyzRC0o7WkJTkrrz9kdCRx11FHhagxGURwBZ7hareTQ8PuHH35oFKxQ/BQ4/vjjwz464IAD/GxghFYpl8ojjzxizjrrrAivTtdLCE7S1Z9cTTmBXXbZxTzxxBPm9ttvL/fdeP97wQUXmIsvvjjewRyVSoE99tgjHHq/8sorU3l9Sb4oBSaaW6L8JEkvWmr90EMPGV1TlgrBSZZ6O4PXqk+5AwcONDfeeGNBV3/++eebO+64w3z66afhY6P99tuvoPo4OB0CNWvWDO+tQu+vdGj4cRWap6FHu3Xq1PGjQRZaUatWrTBXTZbmoBCcWLhxqMJvAQUoV1xxhQmWHMduqJJ3qTRo0CCccLt48eLwefBNN90Uu04OTIdA2f2VxaF333pQc0y0ukr/TVv50Y9+ZJ555pm0XVal10NwUikNP0iTgIZGg0RHVt+0lNpaQ/pBfgIzbdo0c8opp6SJjGvJQ0D317BhwzK9uiIPLmcvnTRpUqr7QHv73Hvvvc78fKqY4MSn3qAtTgV23XVXJ6sslJ/g6KOPNk8//XSYllrPh9P4yc1p56Sg8vr164eTF1NwKYm8BC2/zcIyb21HECQGTGQf5dNogpN8tHht4gU0qayQxzvVATRu3Nicc8455vPPPw/3lBk8eHB1h/DzFAkceeSRplevXim6ouRcyu9+9zvnjdXvtRI+vvzyy2by5MnhpFtNun/22WfDBG/ar8l10fyT4cOHuz6NF/WTLjcBe5QEd4r1fkp6+vq4+aeDrczztgw26Yp7ulzwhpabOHFiLvhUl/d5XfR7MesMRpASm74+bocHiQAL6mebZllJX6/9g3SttovqXLBgQW7IkCE59UuU350gP0kuWP7rdE+pzZs355SGP0p7kvoaRk6CnqNkS0A7jwb7jRTtonfaaSejHaBnzJgR7rJ81113Fe3cnKj4AkoEGPwxK/6JM3zGHj16WN9dPdh/x2gkTO8XSie/bt26SMLBhx/TvXt3owmsmh+iOWm2i+Y49e/f33a1XtVHcOJVdyS3MfoF/MlPfhK+QWj1QnVfem2nTp1M7969zXXXXRfmI3n99dfDxGmuFdS2s88+2/Vptln/nnvuaS666CKzadOmcMv0YgZJ22xQgr4ZfCo2gwYNqvbeKrv3fvGLX5iuXbuayy+/3IwcOdLMnj07vL9Uj+uieQGU4ghoea0CCFtF90ewM7VRhtaZM2cWVG0womO0R5MCHduldevWJu0pDVI9NBTcEFxfJQY2H+t88cUXueAXxYq1hkVHjx6dW7t2re1R2u/qy7e9hTzW+e6klfyPdu3V9QZvslb8fLrnfXxEoTZpi/pVq1ZV0iOFf1uPA4KNAmP1p49mFe8pn9r4xz/+sfAOK1fDAw88EKvfKhpV/PfcuXPLnaXw/9U9psdNFc+Tln8zchL0JKVwAQ0z2ioaFlXaeT0OGTNmjAmer9qq+rt6tLmWy4mx350owv9o+Pf00083S5cuNW+//bYhd0oEtAJeouF5jdiVDbtv3LixgNq2fahGb4I5Adv+Id+1KtCxY0dr9Wkvm3PPPddafeUr0pYa//3vf8t/q6D/1z2m0ee0Fnt/UdIqxHWVVEBBioKIYKTDajv0i92uXTurddqobN999/0ud8pLL71E7hQbqFXUoWF3LTF/7733qnhVvB/psQDFvcBuu+1m5STBWIaVrS4qa4yCYmWatvlhS/sGBaNYlZ0y0d8nOEl092Wj8c8995zp16+f1V9qyR100EHeAip3iibjKXfKxx9/HO6tkdY3oVJ3gv5oKG/E6tWrrTZl9913Z2NAq6JbV6bfiR133HHrH8T4jvpfI7Uui5LE6ctW0d5BxxxzjK3qvKqH4MSr7qAxlQmMGDHC6i+1ztOoUaNE/PHQJ8Oy3CnBskZD7pTK7pL43//kk0/M1VdfbYLn+PErqXCkAszTTjutwnf5p20BjXjYKCtWrIi8IqeQ82kDUU2It1H0OF0rAdNYCE7S2KspvaYLL7zQbNiwwdrV6Q/RN998E6k+JT4qddGjKK1yuu2220wwWdj8/e9/z0RGzGK5K7GVzVUV6i+bq0iK5ZCk89SrV8/aBn/FGpkM8uCYhQsXWmM+7LDDrNXlU0U1fWoMbUGgKoFly5aFWVcPP/zwql4W+Wfbbbdd5CHhefPmhYGBD0GKLlBvpMp2q68PP/wwzFCp+ROUwgSClRrhHjkKLGyUsg0jbdRFHVsLtG3b1miEykb58ssvbVQTqQ49qj744IMjvVZpGtavXx+O6ujRk7LQapTngw8+CCfR/+tf/4pUT9JeRHCStB7LeHunT59ubAUnelNTXcqvUl1RXhR93XLLLeFKIiXa8qUod4pGlZS+W29UDz/8sLnvvvt8aV6i2qE5PrfeeqvRai4bhUmxNhSLU4etgDRKa8ePHx8mgtToreY8Bcvavws69IhRq/YUfChFflYLwUlWez6h1609LTTbXaMeNkq+M+eV0EtfWr44YMCA8LFKsYaDq7vemjVrmkMOOST8uvHGG83zzz8fzqPQGx0lmoBG5/RlK7lVnTp1op2YV8US0IcVPeLUpouFlmbNmoUrA7VPjusS5Dyx0mbX7Sxl/cw5KaU+585boG7dutbTVOfdiOCAqVOnhhPRlIvl2muvNYsXLza2JubFaU/FY8pyp6hdCk5uvvnmii/h35UIaHM3SjIE9CjG1u+dJpdecsklybjwDLSS4CQDnZymS9Qohc2EbzZstO/G/vvvHz5D1lJE20tSC22jcqdotEfPrpU7Rft+UIoj4GJfleK0PBln2X777Y1GDG0VLd9nXyRbmoXVQ3BSmB9HF1lAOT/yfRRTVRNtPR7SOcoy22rUQptyvfHGG1aXplZ1HVF+VpY7ZdSoUd/lTtG+JJTvC9j8Y/f9mvmXbQHNz9B7gq2ieSd/+MMfzA033GCrSuqJKUBwEhOOw0ojsNdee1l7rKNlxK+99pqTC/nzn/9sfv7znxslSVKOFr2J+lTKcqdopY9yp1x66aU+Na+kbYm6vDxKI5lzEkWpsNdEmdCezxkUoFx11VXm8ccfz+cwXmtZgODEMijVuRU4+uijrT3W0R8hTaZzWTQTXwnUFAxotc8rr7xiLQGTjXbrjVi5U7RCpSx3ii97Dtm4vjh12ByZi3N+jslPQPO/bCbP09n1e3HGGWeES3VZop9ff9h6NcGJLUnqKYqAVqPYKp9++qlZtGiRreqqrWfkyJHml7/8pfm///s/c++994ZvfNUeVMQXlOVOmTBhQriMUW30ZSVSsRh0vVqaTUmOwMSJE63vvVV29XrsqVFQvVc8+eST1lZxldXPfysXIDip3IafeCYwcOBAY3OOhM0dQvOl0qcx/RH89a9/baZNm2aKmQAqSlvVtgsuuCDMv/Dqq6+GORmiHJf012gTwF122cXaZRQz+K2s0TbnVZU/h0YXfCh6ZKp71GVp0KBBmN9Iq9+WLFkS5hGy+V7ksu1JrZvgJKk9l7F26xOtlvnZfEP0IbOikjEpZ4qSfinBm1Jb+1TKcqdoFKVv374+Nc1JW3r16hWObNmqfPny5baqil2PsonaLnpcaWsJr422aRKrzblCVbVJ+VD69OkTjnwqJ87o0aPNmWeeWdUh/CyGgL01WDFOziEIRBXQkGrjxo2jvrza1+kZ9WOPPVbt64r5giuuuMLoq1WrVmHulF/96leZe6xSTO9tnUvzDGwV/fFWsq1SFgXzCixvv/12683QqjRfipIzau6JtnMoZmnSpIk5/fTTw6/777/fvPfee2bOnDnhbuLFSOZWzGst9rkITootzvnyFhg3bpz1Nx0Nzc6cOTPvthTjAK0+OOWUU8JTaRVNjx49wt2TbY4aFeM6knYOPTbUp2JbZePGjWb27Nm2qotdjx5VZaGcf/75YTJEW1sP5Gum82pyub40AqdNSjUSqvcZLd/34V7I95pK+Xoe65RSn3NXKfCb3/wmTCWueRm2y9ixY21X6aQ+7UCsnW21SZhGenxL8ObkoktQqR4bXnbZZVYfGy5durSoE65LwObVKfWIxac9pRSs6HdXj0NnzZoVbtY3adIkkiBGvGsITiJC8bKqBWwu5Rs8eHCYe0MBhIZNbRdtspW0dO5K8NatWzejoXRt8qf8LDbNbRsnrT59urU9wvCPf/wjaQyJb++gQYPC5Ic+XkjDhg3NCSecEI6iaIsEsjVX3Us81qnah59GFNDyWO3UqyRpUTNs6tOqjtFX8+bNw2V6jRo1MrVq1Yp41ngv0wQ2TehLahk+fLjRl/zuvPPO8A1v9913T+rllLTdWpr+1FNPWV0FpgtS4KjdoSnFF2jfvn24osZ2sGnzSrQnl1Ll62vo0KFGy6EvuuiiRL8v2fQpqysX/A9fGTQ48cQTc8EM92DeXnZKsOwwF/xRT939HjwCy82YMSMXzHNw0pnBH9tcMDydt5usP/vsMyttituGyt7fgiDV2f3/5ptv5m1V1k6bZlbgHVdiu1/lGCzzza1cudJxy+1Wv2nTplywk3gu2BE79r1Tdg+l4b881gl6kZINgeCtJFwFk+RRk8p6SpOG9YlR++fcfffdRmnp01iUDCtu0ZJtLdfW839NVtUqC1c5QLS6jFI6Ac0/0eRmH/LMRFXQiPNRRx1l3nrrrfAePfDAA6MemsrX8Vgnld3KRW1L4KGHHvJqwty22mjjewMGDDD60h9jrfZRVlrt3pr0otVK2l05Sr4VvdHr8WC9evXCx19KrFasfW6CT+zhUH3SvZPefn0I0coZBe6dO3e2OtnZpY3u8zZt2oTz7l544YWw7Wn8QFWdIcFJdUL8PBUCU6ZMMeeee24qriXqRSjvg75Urr32WvPb3/42nNeT5CXJygHjc9Ho3AMPPMDcAY86Sav+evbsae64445wQrlHTauyKfo91V5iGgW65pprzLBhw6p8fdp+yGOdtPUo17OVgBI0HXvssVt9P0vfuO6668z+++9vlDY/eLYdXrr+kFLsCijr8JVXXmm3UmorWED7WikF/dNPP524VW6aPKtHtcomnaVCcJKl3s7gtU6ePNm0a9cug1f+v0vWqh59mtdeQsoWqscdCkySPILyv6vz5//Wr19PDgt/umObLdHjHa3Q0u7gSQvOTz31VKOUAlkpBCdZ6emMXaf22VACs+OOOy5jV/6/y9XGfUqfvmbNGtO7d29Tfrkxgcn/nGz8n/7QXX/99YmagGnjupNYhzIwax5W69atw5EU3zbdrMr0Zz/7WbinTxY2HSQ4qepO4GeJFHj77bfNQQcdFGb8TOQFFNDoli1bmr/97W/hbsIaJdEbcI0a/JoXQBrpUJkrGKYkR0BBikZSlMlVc7IWLlyYiEc+CkymT5+eHOiYLeVdKyYch/knoNTumlvRokWLzH2C1SqWBQsWhNkxtUNq/fr1/euglLZIk627d++e0qvLxmVp1Eup5rW0XEGmliCXzc3yUUDLpF988UUfm2atTQQn1iipqFQCQWI1c9ddd4Uz8bV1elaKciJor461a9eG6fi1bJLHNcXtfU1SzPpk6+KKuz+b9ljS75KyXivoD5IbermnlbLLDhkyxD1Iic5AcFIieE5buICGNrXfzG677WYuvvjiwitMSA1KJKZdlYNskmHqek14pRRXQOnp//SnPxkXm1IW90o4W1UCt956a5hiXntaaf6aciVpVMWHeSr6IKI8RmlN1kaek6ruTH7mtYD+QGin3iwU5Wro16+fOfTQQ1ORUC3JfbZ8+XJzzjnnGK0E871ooq6C2X/+85/WsuGqzg0bNpjHH388THDnu4Gt9qm/y/f52WefbTp16hTO69pjjz2KluSv/PXUrVs3HDVWO9JWCE7S1qMZup4OHTqE2UJ92ibdNr+u7eSTTzaNGze2XTX15SmgP8pKS69kdkkqS5cuDbOk2myzRut8npNh81orq2vEiBFGX2VF2yEoaVrbtm3NvvvuW7QPEXofVHJCTfBNU+GxTpp6M2PXomFNZU5MW9Gy31dffdVoOXSfPn28CUxc7UPje/+pHzTvQEnskhaY+G6bpvaNGTMm/H3VSsGyFUCLFy92fonKW6TkimkrBCdp69ESXo8mZn7++efVfukTqK2i3B16Dpz0ok+iWo4a7OAbJkxToiifggH1mfKlZKmsWLHCPPzww+FEa00+1BJ1CgJRBbQCSAGtkqfNnz8/6mGxXqfRk7QVgpO09WiJrkfZMTXDfeedd672a86cOVZbqU+zvu+5UtkFa0KblgArqNMSYE2886koq6z+QKtfH330UZ+a5qQtul6lONejtEaNGplevXqxT44T6exU+swzzxjlH9I8pY8//tjJhe+1117mpJNOclJ3qSolOCmVfMrOq0Rf2gMiStHKGpvPq7Xb7PDhw6Oc2ovXKJDSG5ZGmrQawLclwJrsqJVA+sTXpEmT1P6BVkCoVU/aHFGPB3X/6nqVmOvZZ5/14l6hEekR0PwUjfRq3pLN0WMJ6f23a9eu6cEKroQJsanqztJejJ7NRymzZ88O3/xtLsPUKhY9d73nnnuiNKEkr7n55ptNly5djBIo+Vb0ZqnHFlqBoUR2Pha18cEHHzTvvPNO5Ky3tWvX/u61CrpWrVplPvjgg++tuvDxWmlTegXOOOOMcPWUVlHZzN7cvHnzVKERnKSqO5NzMX379jUdO3a0thRRk2O1G6xvwYmWAGtSq/by2H777b3rIM1x0SjJwIEDw63ZvWtghQbNmjUrFXOMKlwW/8yYwO233x6OmPbs2dPalfv2SLjQC+OxTqGCHB9LQFldyy/Di1VJhYN8mhyrfW0++ugjM3bsWHPMMcd4FZh8/fXXRn/ke/ToYXbZZZdwOHjZsmUVNP38p0ZCKAikQUB5Ut59911rlxJ15NraCR1XRHDiGJjqKxfo379/uMNm5a/I/ydnnXVWySbHavKklgDrj792BPYtN8mHH35o7r77bqM/8Icffrh55JFH8gfmCAQQsCaguXK25p/o/Wa//faz1rZSV0RwUuoeyPj5tcmWrV9OUWrNfzEnx2oJsP7IayRI8yG0BFht8KVo0ueECRPCxFCa0T9gwABfmkY7EHAuoNTu+tCgiefKQ6IRw/feey9cgfXAAw84P391J9Dk2C+++KK6l0X6ec2a6Zqlka6ridSFvMgnAc0ROffcc40SF9kqxZgcO3jwYKNRGu1kanNSmw0DDe9qebKW/g4dOtRGldSBgLcCysyqFW8//vGPjdLI6/HurrvuanbccccqU8ord02pix6nrly50srcu40bN4bbCpT6mmydn+DEliT1xBa46qqrwqW1tpKOuZocqyXAWnKqFNU+branHB0aJVHulHXr1sXuDw5EwFcBjUwq6WL9+vXD3DvaWyZu0aq5I444wsycOTNuFVaOU7I/Gyv4lJU2ajoHKw13XAmPdRwDU331ApMmTTIvvvhi9S/M4xW2J8fqj742T1PuD58CEy2PnTZt2nc5SbQKisAkjxuFlyZKoGHDhuaAAw4I89EUEpjoojXieckll5T0+vVe0rRpUytt0HuBcielpRCcpKUnE34dyp5oextym5NjfZrcqjk62rNjyJAhRm/QWpKtpG4UBNIuoA8yGiG0VfS7U8pJpEovUK9ePSuXoxGYpKy6i3LBBCdRlHiNcwH9Uo0ePdrqeTQx1daOxVu2bLHatjiVKSeJ9t/Zc889wz07brjhhjjVcAwCiRaYO3eutfYruC/l3lzaE6fQEaAyDCbElkmk9L8aZlNCKluTHPVHTZMSGWqv/obp16+fOf74442Gbm0VPaP2PXNsVdeqZcl6nKQgi6W/VUnxs6wIaGuBU045xdrGmEqQqPdove8Xu3Tr1s3adaxevbrYzXd6PibEVuC97LLLjCZo2ioagtfStZEjR9qqMrX1KIDT6h3t5mmruJoca6t9ldWj5Ex6VFPqZ+KVtY/vI1AqgXHjxoVLg21+iNESe22LYGukNYqNgiJ9GLNVlOk5TYXHOhV6s127dhW+U9g/NTeAwCS6oR5V2N6aXpNjkzDqoJwkCkjatm1r9tlnHwKT6LcNr8yQgD7EzJgxw+oVa6RcH4y0KWmxyqhRo6zlRNJGqspGnaZCcFKuN/VIRzPBbRWNmviQ6MfW9RSrHi3X3bx5s9XTacdOLQX2rSgnyWuvvWYGDRoULo3UaiBtjEhBAIHKBbT1he107QpQ9HhHm1+6LnpUa2P5cFk733//ffP666+X/TMV/yU4KdeNLVu2NDY3T9IkT5JglQOO+L+aGKs08DaLzcmxNtqlFQd/+ctfwvtN82K4T2yoUkdWBLRqZ+HChdYvV4+BtWuwMj5rDpztop3J16xZY/2DUtoe6cid4KTc3de5c2djc8ZzKWeBl7usRP6v5lpoqNJmKZsca7POfOpav369mTp1KjlJ8kHjtQhUIjBs2DDjahWdMsyqfm3eqXkoeu+IW/Sh9+GHHw4Dnssvv9za0uGy9uh98v777y/7Z2r+y4TYcl2pZ/22iiJvPg3H19SjDc2/OO200+JXUuHIUkyO1aO9N9980zzxxBOGpb8VOoR/IlCAgD78nXfeeaZNmzYF1FL1ocpv1KdPn/Br1apVRptnaoGDJqwrcNG+OJorplT5WhLcoEED06hRozCVvh7b6P9dJ23UKHPaHumoVwhOvr03dQM1b9686js1j58+9thjLB/Ow2tbL73wwgvNsccea/WXu2xybPfu3bd1Smvf034ZU6ZMMfqklKbESNaAqAgBCwJaUvzWW2+F6ewtVFdlFXrkr6+DDz64ytcV84caOdKmhmksPNb5tlfbt28fRr02OlmRNKMmhUtq9MnFcKWrybHKSfLKK6+YHj16hLlalKGWwKTw+4AaEKhMQO8RGtmwPYG+svP59n19CFbelzQWgpNve1Wf0G1tPKebhT9Kdn5dlBhp6dKldir7thbbk2OXLFli7rzzTlO7dm2j3AVJWLZsFZTKECihgCbQa3J51sr8+fON6xHgUpoSnHyrX8iEp/IdqEmPzC0oL1L4/99yyy1GczdslkInx5bPSaLHgSRLs9k71IVAfgLKAj158uT8Dkrwq5UN1uZ8PB8pCE6CXtF8E1ubP2k1hu0kYj7eOMVs0/Dhw828efOsnrJscmzUyWpaxaUAiZwkVruByhCwJnDccceZOXPmWKvP14q++uqrMH1/2v/OEJwEd6Dmm9jYGVJLuhg1cfMrffXVV1tPuqTJsQp8ohTNH9E9ohEX5hNFEeM1CBRfQCt30hyg6G9M7969zcyZM4uPW+QzEpwE4NrfwMZ8k5deeimVS7qKfE9u83RKuqRRKdsl6uTYRYsWsfrKNj71IeBAQAHKxIkTHdRc2irXrl1rTjrpJKNJsFkoBCdBLx966KEF97WWdDFqUjBjlRWcf/75ZsOGDVW+Jt8f2p4cm+/5eT0CCNgX0B/xIUOGGD0CSUNRuvumTZtmal5N5oMT7WxpI7/JrFmzMjHUVspfdK2AcvGpodDJsaU04dwIILBtAX1Y1Pv7yy+/vO0XJOC7+jCm62jdunXmRm4zH5wceeSRZqeddiroNtWoCfMQCiKMfLBWxSi3gc2iybHabDDq5Fib56YuBBBwJ6AdjLXTvFa2aMl/Uoom3z/33HNhhlmNAGWxZD446dixY8HzTbQB1fjx47N4/xT9mvVmo63NbRd9woo6Odb2uakPAQTcCowbNy4cIddmfj4HKdpp+YUXXjD777+/OeGEEzI3WlL+Lsh8cFJofhNFuNoYihLshRAsty1G0TDn4sWLrZ9Kk2Nd7tNhvcEJqVAjU7aKjYnrttrisp4kmCWhjRX7SB9s9BhfIynTp083X375ZcWXlOTf2qVcmwMqPf7RRx9NOoqgFzIdnOjT8j777FPQzfjOO+8QnASCSt2uqL9YRY9hbKes1uRYJXOi2BWw+QfAdp/bvVJ7tdn6XdKHJ402uihJ7leNpHTo0MHssMMOpn///mbatGnm448/tp7ssTJ3JetcsGCB0eaF2nC2SZMmplevXs76qrJ2+Px9faSxm3rT56ut0LYuXbqEEyzjfhrTL742drvtttsq1Mw/EUAAAQSSKKAPKJqA2qJFizBoqF+/vqlTp06skWGtFlI2ac2T0+MkpZzX9iZz585NIk1R25zp4GTEiBGmZ8+escG1emSPPfaIfTwHIoAAAggkQ6BVq1Zm7733No0bNw5HXGrUqBEGLQpAFLzovxpN0giM0stnKZ2+ix4sziQBFy23UKei40IKG7wVosexCCCAQHIEXn/9dZJsFrG7MjtyooQ2yvoZd/noypUrw/kqrp7nFvEe4FQIIIAAAgh4JZDZCbGdOnUydevWjd0ZY8aMYfJSbD0ORAABBBBAoHKBzAYnWq6lZ4ZxiiY43XzzzXEO5RgEEEAAAQQQqEYg3l/naipNwo8PPvjg2M3UplKaDEtBAAEEEEAAAfsCmZxzovkmSuKlNe75Fs3G1kRazVehIIAAAggggIB9gUyOnJx88snh0q84nFOmTCEwiQPHMQgggAACCEQUyGRwcsQRR8Sab7Jp0yZz/fXXR6TlZQgggAACCCAQRyCTwYmS6cQp2npba90pCCCAAAIIIOBOIHPBieabxMnqumXLFpPVravd3X7UjAACCCCAwNYCmQtO4s43ee2118zMmTO3FuQ7CCCAAAIIIGBVIHPBifKb5LvVt0ZNbrnlFqvwVIYAAggggAAC2xbI3FLid955J0w7v22ObX9XO0m2bNly2z/kuwgggAACCCBgVSBTIyeab6IdJfMpuVzO3HffffkcwmsRQAABBBBAoACBTAUnXbt2zTu/yfvvv09wUsANxqEIIIAAAgjkK5Cp4KR9+/Z5zTfRqMlf//rXfE15PQIIIIAAAggUIJCpOSdLliwxzZo1i8y1fPnyvB8DRa6cFyKAAAIIIIDANgUyM3KioERzTvIpo0aNyuflvBYBBBBAAAEELAhkJjjp1q2bqVWrVmSyVatWmZtuuiny63khAggggAACCNgRyExw0qFDh7zmm4wePdqsW7fOjjK1IIAAAggggEBkgZqRX5nwFy5dutQsW7bMbN68udor2bBhA6Mm1SrxAgQQQAABBNwIZGpCrBtCakUAAQQQQAABmwKZeaxjE426EEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAIEJzHQOAQBBBBAAAEE3AkQnLizpWYEEEAAAQQQiCFAcBIDjUMQQAABBBBAwJ0AwYk7W2pGAAEEEEAAgRgCBCcx0DgEAQQQQAABBNwJEJy4s6VmBBBAAAEEEIghQHASA41DEEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAIEJzHQOAQBBBBAAAEE3AkQnLizpWYEEEAAAQQQiCFAcBIDjUMQQAABBBBAwJ0AwYk7W2pGAAEEEEAAgRgCBCcx0DgEAQQQQAABBNwJEJy4s6VmBBBAAAEEEIghQHASA41DEEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAIEJzHQOAQBBBBAAAEE3AkQnLizpWYEEEAAAQQQiCFAcBIDjUMQQAABBBBAwJ0AwYk7W2pGAAEEEEAAgRgCBCcx0DgEAQQQQAABBNwJEJy4s6VmBBBAAAEEEIghQHASA41DEEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAIEJzHQOAQBBBBAAAEE3AkQnLizpWYEEEAAAQQQiCFAcBIDjUMQQAABBBBAwJ0AwYk7W2pGAAEEEEAAgRgCBCcx0DgEAQQQQAABBNwJEJy4s6VmBBBAAAEEEIghQHASA41DEEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAIEJzHQOAQBBBBAAAEE3AkQnLizpWYEEEAAAQQQiCFAcBIDjUMQQAABBBBAwJ0AwYk7W2pGAAEEEEAAgRgCBCcx0DgEAQQQQAABBNwJEJy4s6VmBBBAAAEEEIghQHASA41DEEAAAQQQQMCdAMGJO1tqRgABBBBAAIEYAgQnMdA4BAEEEEAAAQTcCRCcuLOlZgQQQAABBBCIIUBwEgONQxBAAAEEEEDAnQDBiTtbakYAAQQQQACBGAL/D7hQqCMAoNYaAAAAAElFTkSuQmCC';
            var chars = atob(b64);
            var ints = new Array(chars.length);
            for (var i = 0; i < chars.length; i++) {
                ints[i] = chars.charCodeAt(i);
            }
            var byteArray = new Uint8Array(ints);
            var blob = new Blob([byteArray], {type: 'image/png'});
            var fileReader = new FileReader();
            fileReader.addEventListener("loadend", function(res) {
                var pt = sjcl.codec.arrayBuffer.toBits(this.result);
                var p = h.encryptBinary(pt, key, 'foo@bar.com');
                p.done(function (data) {
                    h.decryptBinary(data.ct, key, data.params)
                    .done(function (result) {
                        result = husher._bytes.toBits(result);
                        result = husher._b64.fromBits(result);
                        expect(result).toEqual(b64);
                        done();
                    });
                });
            });
            fileReader.readAsArrayBuffer(blob);
        });

        it('can sign/verify using ECDSA Public-Private cryptosystem', function () {
            var sig = h.sign('foo');
            expect(h.verify('foo', sig)).toBeTruthy();
            var h2 = new husher.Husher();
            expect(h2.verify('foo', sig, h.signingKey.pub)).toBeTruthy();
        });


        it('calculates the correct fingerprint of the keys', function (done) {
            var h2 = new husher.Husher(),
                json = '{"scrypt":{"scryptSalt":"MUkhdycPtis=","pN":16384,"pr":8,"pp":1},"encKey":{"macSalt":"OiuQ/DD/kc1/Oz89wcd+CIk+bzMHpnRbrwK3DPixF8s=","pub":"VpaLnle5yBAaWKUPIf6j4uBGkh6Yc3xpHwgptuFkEjvXkWlsS9b7epZRNK4PC9dWStvdHKbM7BjeVb5UsTtK1OuAJKlJk/HO14Cv7BKST60e6FJAsK59s4ELa6PWLwLb","sec":{"macSalt":"OiuQ/DD/kc1/Oz89wcd+CIk+bzMHpnRbrwK3DPixF8s=","iv":"Mv8i3RShJbObmB6y6Lnd7Q==","ct":"fJw28td7y+RtxJrWUdalXSIfoXOMr04EIbEocN45AuieGdvHWjEDX4pFnir5k3ZLHcYNhudeZsGFHR8jXgEgsVGfLhI2/INp9uOfyQwMI2o=","adata":"foo@bar.com"}},"signingKey":{"pub":"VfBxd8akQWuqhbL/qbXiGuPy5ku5mOtVmcGwngS4UXWAwjxeYBWopuCPWhTWM+doZDy4xtyUzkaR07l5USGwQBPElLpONKC1+IRdmz+dzRjLBd4Iqrwgk3biNq5viakK","sec":{"macSalt":"BED1rretn06sq9k4qThzw9tY0nemyPtf+b+mD+gTbYg=","iv":"tWG9Wr3kx182hIgWOMIIvg==","ct":"sjPmo3EF93DH7sytqXZhJMw6PpiODImfVccZodRxHblMENBmRZm6qX4hkkgAfF1kP8F1TqXGoENbT/LlOIdKPc9rD9FE6fMCVBc6bvkbjSM=","adata":"foo@bar.com"}},"authHash":"d+XnaY7zS3ytE46kOdUDnvb1gVWFz1IAR1lAeVyRgjg=","version":2}';
            h2.fromJSON('secret', JSON.parse(json))
            .done(function () {
                expect(h2.fingerprint()).toEqual([ -1335594577, 220561193, -509001404, 842612495, -1283032269, 258428455, -856053441, -796156258 ]);
                done();
            });

        });

        it('generates a new key, signs and encrypts it using the public keys of a set of users', function () {
            var keypairs = {
                    foo: sjcl.ecc.elGamal.generateKeys(husher._CURVE),
                    bar: sjcl.ecc.elGamal.generateKeys(husher._CURVE)
                },
                 pubKeys = {
                    foo: keypairs.foo.pub,
                    bar: keypairs.bar.pub
                }, result, key;

            result = h.generateKeyAndEncryptToPublicKeys(pubKeys);
            // Verify both foo and bar can decrypt and obtain the same random key
            expect(h.decrypt(result.keys.foo, keypairs.foo.sec)).toEqual(h.decrypt(result.keys.bar, keypairs.bar.sec));

            // Verify the signature of the key
            key = h.decrypt(result.keys.foo, keypairs.foo.sec);
            expect(h.verify(key, result.signature, h.signingKey.pub)).toBeTruthy();
        });

        it('can serialize the cryptosystem to JSON and back with the legacy JSON formatter', function (done) {
            var h2, json, res;
            json = h._legacyToJSON('foo@bar.com');

            h2 = new husher.Husher();
            h2._legacyFromJSON('secret', json)
            .done(function () {
                res = h.encrypt('foo', h.encryptionKey.pub);
                expect(h2.decrypt(res, h2.encryptionKey.sec)).toEqual('foo');
                res = h2.encrypt('foo', h2.encryptionKey.pub);
                expect(h.decrypt(res, h.encryptionKey.sec)).toEqual('foo');
                done();
            });
        });

        it('can serialize the cryptosystem to JSON and back with the JSON formatter', function (done) {
            var h2, json, res;
            json = h.toJSON('foo@bar.com');

            h2 = new husher.Husher();
            h2.fromJSON('secret', json)
            .done(function () {
                res = h.encrypt('foo', h.encryptionKey.pub);
                expect(h2.decrypt(res, h2.encryptionKey.sec)).toEqual('foo');
                res = h2.encrypt('foo', h2.encryptionKey.pub);
                expect(h.decrypt(res, h.encryptionKey.sec)).toEqual('foo');

                res = h.sign('foo');
                expect(h2.verify('foo', res)).toBeTruthy();
                res = h2.sign('foo');
                expect(h.verify('foo', res)).toBeTruthy();
                done();
            });
        });

        it('will use the legacy JSON formatter when appropriate', function (done) {

            var h = new husher.Husher(),
                h2 = new husher.Husher(),
                json;

            spyOn(h, '_legacyToJSON').and.callThrough();
            spyOn(h2, '_legacyFromJSON').and.callThrough();

            h.generate('secret', 'foo@bar.com').done(function () {
                delete h.signingKey;
                json = h.toJSON('foo@bar.com');
                expect(h._legacyToJSON).toHaveBeenCalled();
                h2.fromJSON('secret', json).done(function () {
                    expect(h2._legacyFromJSON).toHaveBeenCalled();
                    done();
                });
            });

        });

        it('can save and load a session in JSON format', function () {
            var session = h.toSession();
            var h2 = new husher.Husher();
            var ct = h.encrypt('foo');
            var sig = h.sign('foo');
            h2.fromSession(session);
            expect(h2.decrypt(ct)).toEqual('foo');
            expect(h2.verify('foo', sig)).toBeTruthy();
            expect(h2.authHash).toEqual(h.authHash);
        });

    });
});