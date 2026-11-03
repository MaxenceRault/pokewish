-- Migration volontairement cassée (test du runner) : la 1re instruction
-- réussit, la 2e échoue -> la transaction doit tout annuler.
create table half_done (id integer);
select * from table_qui_n_existe_pas;
